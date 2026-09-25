const mongoose = require("mongoose");

const Stocking = require("../models/Stocking");
const Expense = require("../models/Expense");
const Mortality = require("../models/Mortality");
const Sale = require("../models/Sale");
const InventoryTransaction = require("../models/InventoryTransaction");

const LAGOS_TIMEZONE = "Africa/Lagos";

/*
 * ============================================================
 * WHERE THE FARM'S MONEY ACTUALLY LEAVES THE BUSINESS
 *
 * This project has THREE independent places where a real
 * cash outflow gets recorded:
 *
 *   1. Stocking      -> Stocking.cost
 *      (buying fingerlings to put in a pond)
 *
 *   2. Expenses       -> Expense.amount
 *      (feed, fuel, medicine, repairs, transport, utilities,
 *      logged directly from the Expenses menu)
 *
 *   3. Inventory stock-in -> InventoryTransaction
 *      (quantity * unitCost, where transactionType === "stock_in")
 *      (feed, salt, medicine, nets, buckets, pipes, fuel,
 *      equipment... logged from the Inventory menu when
 *      stock is brought IN)
 *
 * An earlier version of this audit only looked at (1) and
 * (2), which understated total spend on any farm that logs
 * its material purchases through the Inventory "Stock In"
 * action instead of (or as well as) the Expenses menu. A
 * real audit has to add up EVERY outflow, wherever it was
 * recorded, so this file treats all three as first-class,
 * equally-weighted cost centres.
 * ============================================================
 */

/*
 * ============================================================
 * HELPERS
 *
 * All "year" boundaries are calculated using Africa/Lagos
 * calendar time so a farm record made at 11:50pm on 31st
 * December in Lagos is never pushed into the wrong audit
 * year by server/UTC time drift.
 * ============================================================
 */

const roundMoney = (value) => {
  return Number((Number(value) || 0).toFixed(2));
};

const roundNumber = (value, decimals = 2) => {
  return Number((Number(value) || 0).toFixed(decimals));
};

const getLagosYear = (value = new Date()) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: LAGOS_TIMEZONE,
      year: "numeric",
    }).format(date),
  );
};

const getCurrentLagosYear = () => getLagosYear(new Date());

/**
 * Return the { from, to } instant range (as real UTC
 * Date objects) that corresponds to a full Lagos
 * calendar year. Passing no year returns null bounds,
 * meaning "all time".
 */
const getYearRange = (year) => {
  if (!year) {
    return {
      from: null,
      to: null,
    };
  }

  const numericYear = Number(year);

  const from = new Date(`${numericYear}-01-01T00:00:00+01:00`);

  const to = new Date(`${numericYear + 1}-01-01T00:00:00+01:00`);

  to.setMilliseconds(to.getMilliseconds() - 1);

  return {
    from,
    to,
  };
};

const buildDateMatch = (field, from, to) => {
  if (!from && !to) {
    return {};
  }

  const range = {};

  if (from) {
    range.$gte = from;
  }

  if (to) {
    range.$lte = to;
  }

  return {
    [field]: range,
  };
};

/*
 * ============================================================
 * DISTINCT YEARS
 *
 * Looks across every farm ledger (stocking, expenses,
 * inventory stock-in, sales, mortality) to build the list
 * of years the "Audit" screen should let the user page
 * through. The current year is always included, even when
 * it has no records yet, so a brand new farm still has
 * somewhere to see "money spent so far".
 * ============================================================
 */
const getAuditYears = async () => {
  const yearOf = (field) => ({
    $year: {
      date: field,
      timezone: LAGOS_TIMEZONE,
    },
  });

  const [
    stockingYears,
    expenseYears,
    inventoryYears,
    saleYears,
    mortalityYears,
  ] = await Promise.all([
    Stocking.aggregate([{ $group: { _id: yearOf("$stockingDate") } }]),

    Expense.aggregate([{ $group: { _id: yearOf("$expenseDate") } }]),

    InventoryTransaction.aggregate([
      { $match: { transactionType: "stock_in" } },
      {
        $lookup: {
          from: "inventories",
          let: { inventoryId: "$inventoryItem" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$inventoryId"] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
          ],
          as: "item",
        },
      },
      { $match: { item: { $ne: [] } } },
      { $group: { _id: yearOf("$transactionDate") } },
    ]),

    Sale.aggregate([{ $group: { _id: yearOf("$saleDate") } }]),

    Mortality.aggregate([{ $group: { _id: yearOf("$date") } }]),
  ]);

  const years = new Set([getCurrentLagosYear()]);

  [
    stockingYears,
    expenseYears,
    inventoryYears,
    saleYears,
    mortalityYears,
  ].forEach((result) => {
    result.forEach((item) => {
      if (Number.isInteger(item._id)) {
        years.add(item._id);
      }
    });
  });

  return Array.from(years).sort((a, b) => b - a);
};

/*
 * ============================================================
 * LIFETIME AVERAGE COST PER FISH STOCKED
 *
 * Used to place a Naira value on fish lost to mortality
 * when the audited year itself has no stocking cost to
 * work from (e.g. fish stocked last year, died this year).
 * ============================================================
 */
const getLifetimeAverageCostPerFish = async () => {
  const [result] = await Stocking.aggregate([
    {
      $group: {
        _id: null,
        totalCost: { $sum: "$cost" },
        totalQuantity: { $sum: "$fingerlingQuantity" },
      },
    },
  ]);

  if (!result || !result.totalQuantity) {
    return 0;
  }

  return result.totalCost / result.totalQuantity;
};

/*
 * ============================================================
 * CORE FINANCIAL COMPUTATION FOR ONE PERIOD
 *
 * `from`/`to` of null/undefined means "all time" (lifetime).
 * This single function powers both the per-year audit and
 * the lifetime/overview audit so the math never drifts
 * apart between the two views.
 * ============================================================
 */
const computePeriodFinancials = async ({
  from,
  to,
  includeItems = false,
} = {}) => {
  const stockingMatch = buildDateMatch("stockingDate", from, to);
  const expenseMatch = buildDateMatch("expenseDate", from, to);
  const mortalityMatch = buildDateMatch("date", from, to);
  const saleMatch = {
    ...buildDateMatch("saleDate", from, to),
    paymentStatus: { $ne: "cancelled" },
  };

  /*
   * Only "stock_in" movements represent money actually
   * leaving the business to bring material INTO the farm.
   * "stock_out" (feed used), "adjustment", "return",
   * "damaged" and "expired" are stock-level corrections,
   * not new spend, so they are deliberately excluded here.
   */
  const inventoryMatch = {
    ...buildDateMatch("transactionDate", from, to),
    transactionType: "stock_in",
  };

  const [
    stockingAgg,
    expenseTotalsAgg,
    expenseByCategoryAgg,
    inventoryTotalsAgg,
    inventoryByCategoryAgg,
    mortalityAgg,
    mortalityByCauseAgg,
    saleAgg,
    saleByStatusAgg,
    lifetimeAverageCostPerFish,
  ] = await Promise.all([
    Stocking.aggregate([
      { $match: stockingMatch },
      {
        $group: {
          _id: null,
          totalCost: { $sum: "$cost" },
          totalQuantity: { $sum: "$fingerlingQuantity" },
          records: { $sum: 1 },
        },
      },
    ]),

    Expense.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" },
          expenseCount: { $sum: 1 },
        },
      },
    ]),

    Expense.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: "$category",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
      {
        $project: {
          _id: 0,
          category: "$_id",
          amount: 1,
          count: 1,
        },
      },
    ]),

    /*
     * INNER JOIN, not a lookup + preserve.
     *
     * A "stock_in" transaction whose inventoryItem no longer
     * resolves to a real Inventory document belonged to an
     * item that has since been permanently deleted. Deleting
     * an item now cascades and removes its transactions too
     * (see inventoryService.deleteItem), so this only matters
     * for data created before that fix existed — and it must
     * never be counted as money currently spent on production.
     * The $match on a non-empty "item" array turns this into a
     * genuine inner join: no matching item, no contribution to
     * the total.
     */
    InventoryTransaction.aggregate([
      { $match: inventoryMatch },
      {
        $lookup: {
          from: "inventories",
          let: {
            inventoryId: "$inventoryItem",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$inventoryId"] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
          ],
          as: "item",
        },
      },
      { $match: { item: { $ne: [] } } },
      { $unwind: "$item" },
      {
        $group: {
          _id: null,
          // IMPORTANT: audit cost follows the CURRENT inventory unitCost.
          // Updating an inventory item's unit cost therefore immediately
          // updates the audit value for its existing stock-in quantity.
          totalValue: { $sum: { $multiply: ["$quantity", "$item.unitCost"] } },
          totalQuantity: { $sum: "$quantity" },
          records: { $sum: 1 },
        },
      },
    ]),

    InventoryTransaction.aggregate([
      { $match: inventoryMatch },
      {
        $lookup: {
          from: "inventories",
          let: {
            inventoryId: "$inventoryItem",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$inventoryId"] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
          ],
          as: "item",
        },
      },
      { $match: { item: { $ne: [] } } },
      { $unwind: "$item" },
      {
        $group: {
          _id: { $ifNull: ["$item.category", "other"] },
          amount: { $sum: { $multiply: ["$quantity", "$item.unitCost"] } },
          quantity: { $sum: "$quantity" },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
      {
        $project: {
          _id: 0,
          category: "$_id",
          amount: 1,
          quantity: 1,
          count: 1,
        },
      },
    ]),

    Mortality.aggregate([
      { $match: mortalityMatch },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$quantity" },
          records: { $sum: 1 },
        },
      },
    ]),

    Mortality.aggregate([
      { $match: mortalityMatch },
      {
        $group: {
          _id: "$estimatedCause",
          quantity: { $sum: "$quantity" },
          records: { $sum: 1 },
        },
      },
      { $sort: { quantity: -1 } },
      {
        $project: {
          _id: 0,
          cause: "$_id",
          quantity: 1,
          records: 1,
        },
      },
    ]),

    Sale.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalCollected: { $sum: "$amountPaid" },
          totalFishSold: { $sum: "$quantitySold" },
          totalWeightKg: { $sum: "$totalWeight" },
          salesCount: { $sum: 1 },
        },
      },
    ]),

    Sale.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: "$paymentStatus",
          amount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          amount: 1,
          count: 1,
        },
      },
    ]),

    getLifetimeAverageCostPerFish(),
  ]);

  const stockingCost = roundMoney(stockingAgg[0]?.totalCost || 0);
  const stockingQuantity = stockingAgg[0]?.totalQuantity || 0;
  const stockingRecords = stockingAgg[0]?.records || 0;

  const totalExpenses = roundMoney(expenseTotalsAgg[0]?.totalExpenses || 0);
  const expenseCount = expenseTotalsAgg[0]?.expenseCount || 0;

  const inventoryValue = roundMoney(inventoryTotalsAgg[0]?.totalValue || 0);
  const inventoryQuantity = inventoryTotalsAgg[0]?.totalQuantity || 0;
  const inventoryRecords = inventoryTotalsAgg[0]?.records || 0;

  const mortalityQuantity = mortalityAgg[0]?.totalQuantity || 0;
  const mortalityRecords = mortalityAgg[0]?.records || 0;

  const averageCostPerFish =
    stockingQuantity > 0
      ? stockingCost / stockingQuantity
      : lifetimeAverageCostPerFish;

  const mortalityEstimatedValue = roundMoney(
    mortalityQuantity * (averageCostPerFish || 0),
  );

  const totalRevenue = roundMoney(saleAgg[0]?.totalRevenue || 0);
  const totalCollected = roundMoney(saleAgg[0]?.totalCollected || 0);
  const totalOutstanding = roundMoney(totalRevenue - totalCollected);
  const totalFishSold = saleAgg[0]?.totalFishSold || 0;
  const totalWeightKg = roundNumber(saleAgg[0]?.totalWeightKg || 0, 3);
  const salesCount = saleAgg[0]?.salesCount || 0;

  /*
   * TOTAL COST OF PRODUCTION
   *
   * Every naira the farm actually paid out, regardless of
   * which menu it was recorded from:
   *
   *   Stocking (fingerlings) + Expenses + Inventory stock-in
   */
  const totalCostOfProduction = roundMoney(
    stockingCost + totalExpenses + inventoryValue,
  );

  const netProfit = roundMoney(totalRevenue - totalCostOfProduction);

  const netProfitCollected = roundMoney(totalCollected - totalCostOfProduction);

  const profitMarginPercent =
    totalRevenue > 0 ? roundNumber((netProfit / totalRevenue) * 100) : null;

  const costPerFishStocked =
    stockingQuantity > 0
      ? roundMoney(totalCostOfProduction / stockingQuantity)
      : null;

  const costPerKgSold =
    totalWeightKg > 0
      ? roundMoney(totalCostOfProduction / totalWeightKg)
      : null;

  const survivalEstimate =
    stockingQuantity > 0
      ? roundNumber(
          Math.max(
            ((stockingQuantity - mortalityQuantity) / stockingQuantity) * 100,
            0,
          ),
        )
      : null;

  /*
   * A single, top-level "where did the money go" summary —
   * the three real cost centres, side by side. This is what
   * the audit screen leads with; the category-level detail
   * inside Expenses / Inventory stays one level down so the
   * headline view isn't cluttered.
   */
  const costBreakdown = [
    {
      key: "stocking",
      label: "Stocking (fingerlings)",
      amount: stockingCost,
    },
    {
      key: "expenses",
      label: "Farm expenses",
      amount: totalExpenses,
    },
    {
      key: "inventory",
      label: "Inventory / materials stocked in",
      amount: inventoryValue,
    },
  ].filter((row) => row.amount > 0 || totalCostOfProduction === 0);

  const result = {
    stocking: {
      totalCost: stockingCost,
      totalQuantity: stockingQuantity,
      records: stockingRecords,
    },

    expenses: {
      totalAmount: totalExpenses,
      count: expenseCount,
      byCategory: expenseByCategoryAgg.map((item) => ({
        ...item,
        amount: roundMoney(item.amount),
      })),
    },

    inventory: {
      totalValue: inventoryValue,
      totalQuantity: inventoryQuantity,
      records: inventoryRecords,
      byCategory: inventoryByCategoryAgg.map((item) => ({
        ...item,
        amount: roundMoney(item.amount),
      })),
    },

    mortality: {
      totalQuantity: mortalityQuantity,
      records: mortalityRecords,
      estimatedValue: mortalityEstimatedValue,
      averageCostPerFishUsed: roundMoney(averageCostPerFish || 0),
      byCause: mortalityByCauseAgg,
      survivalRatePercent: survivalEstimate,
    },

    sales: {
      totalRevenue,
      totalCollected,
      totalOutstanding,
      totalFishSold,
      totalWeightKg,
      salesCount,
      byPaymentStatus: saleByStatusAgg.map((item) => ({
        ...item,
        amount: roundMoney(item.amount),
      })),
    },

    costBreakdown,

    totals: {
      totalCostOfProduction,
      totalRevenue,
      totalCollected,
      totalOutstanding,
      netProfit,
      netProfitCollected,
      profitMarginPercent,
      costPerFishStocked,
      costPerKgSold,
      currency: "NGN",
    },
  };

  if (includeItems) {
    const [
      stockingItems,
      expenseItems,
      inventoryItems,
      mortalityItems,
      saleItems,
    ] = await Promise.all([
      Stocking.find(stockingMatch)
        .sort({ stockingDate: -1 })
        .populate("pond", "name pondNumber")
        .select(
          "stockingDate pond fingerlingQuantity fingerlingSize fingerlingSizeUnit supplier cost",
        )
        .lean(),

      Expense.find(expenseMatch)
        .sort({ expenseDate: -1 })
        .select("expenseDate category description amount vendor reference")
        .lean(),

      InventoryTransaction.find(inventoryMatch)
        .sort({ transactionDate: -1 })
        .populate({
          path: "inventoryItem",
          match: { isActive: true },
          select: "name category unitCost isActive",
        })
        .select(
          "transactionDate inventoryItem quantity unitCost referenceType notes",
        )
        .lean(),

      Mortality.find(mortalityMatch)
        .sort({ date: -1 })
        .populate("pond", "name pondNumber")
        .select("date pond quantity estimatedCause notes")
        .lean(),

      Sale.find(saleMatch)
        .sort({ saleDate: -1 })
        .populate("pond", "name pondNumber")
        .select(
          "invoiceNumber saleDate pond customerName quantitySold totalWeight totalAmount amountPaid paymentStatus",
        )
        .lean(),
    ]);

    result.stocking.items = stockingItems;
    result.expenses.items = expenseItems;

    /*
     * populate() silently resolves a deleted item's reference to
     * null. Those rows belong to a permanently deleted inventory
     * item and must never be shown in the ledger — filter them
     * out here as a last line of defence, on top of the inner
     * joins already applied to the totals above.
     */
    result.inventory.items = inventoryItems
      .filter(
        (item) => item.inventoryItem && item.inventoryItem.isActive === true,
      )
      .map((item) => {
        /*
         * IMPORTANT:
         * The audit ledger must always use the CURRENT inventory
         * item's unitCost.
         *
         * We intentionally do NOT use the historical transaction
         * unitCost here because the audit represents the current
         * audited value of the inventory record.
         */
        const currentUnitCost = Number(
          item.inventoryItem.unitCost ?? item.unitCost ?? 0,
        );

        const quantity = Number(item.quantity || 0);

        return {
          ...item,

          // Current inventory cost shown in the audit ledger.
          unitCost: currentUnitCost,

          // Current audited amount for this stock-in record.
          amount: roundMoney(quantity * currentUnitCost),
        };
      });

    result.mortality.items = mortalityItems;
    result.sales.items = saleItems;
  }

  return result;
};

/**
 * Work out a human, farm-manager-friendly status label
 * for a given audited year.
 */
const getAuditStatus = ({ year, totals, sales }) => {
  const currentYear = getCurrentLagosYear();

  const hasSpending = totals.totalCostOfProduction > 0;

  const hasSales = sales.salesCount > 0;

  if (Number(year) === currentYear) {
    if (!hasSpending && !hasSales) {
      return {
        code: "NO_ACTIVITY",
        label: "No activity recorded yet",
      };
    }

    if (hasSpending && !hasSales) {
      return {
        code: "IN_PROGRESS",
        label: "Ongoing — stocking & growing, no sales yet",
      };
    }

    return {
      code: "IN_PROGRESS",
      label: "Ongoing — harvest & sales in progress",
    };
  }

  if (!hasSpending && !hasSales) {
    return {
      code: "NO_ACTIVITY",
      label: "No activity recorded",
    };
  }

  if (hasSpending && !hasSales) {
    return {
      code: "CLOSED_NO_SALES",
      label: "Closed — no sales recorded",
    };
  }

  return {
    code: "CLOSED",
    label: "Closed / completed",
  };
};

/**
 * Full audit for a single calendar year, including the
 * transaction-level ledger the audit screen displays.
 */
const getYearlyAudit = async (year) => {
  const numericYear = Number(year);

  if (!Number.isInteger(numericYear)) {
    const error = new Error("A valid audit year is required.");
    error.code = "INVALID_YEAR";
    throw error;
  }

  const { from, to } = getYearRange(numericYear);

  const financials = await computePeriodFinancials({
    from,
    to,
    includeItems: true,
  });

  const status = getAuditStatus({
    year: numericYear,
    totals: financials.totals,
    sales: financials.sales,
  });

  return {
    year: numericYear,
    period: { from, to },
    isCurrentYear: numericYear === getCurrentLagosYear(),
    status,
    generatedAt: new Date(),
    timeZone: LAGOS_TIMEZONE,
    ...financials,
  };
};

/**
 * Lightweight per-year summary (no item ledger) used to
 * build the multi-year overview / trend list.
 */
const getYearSummary = async (year) => {
  const { from, to } = getYearRange(year);

  const financials = await computePeriodFinancials({
    from,
    to,
    includeItems: false,
  });

  const status = getAuditStatus({
    year,
    totals: financials.totals,
    sales: financials.sales,
  });

  return {
    year,
    status,
    stockingCost: financials.stocking.totalCost,
    expenses: financials.expenses.totalAmount,
    inventoryValue: financials.inventory.totalValue,
    mortalityQuantity: financials.mortality.totalQuantity,
    mortalityEstimatedValue: financials.mortality.estimatedValue,
    revenue: financials.sales.totalRevenue,
    collected: financials.sales.totalCollected,
    totalCostOfProduction: financials.totals.totalCostOfProduction,
    netProfit: financials.totals.netProfit,
  };
};

/**
 * The landing view for the Audit menu: lifetime totals
 * across every year the farm has operated, plus a
 * year-by-year trend so the user can click into any year.
 */
const getAuditOverview = async () => {
  const years = await getAuditYears();

  const [lifetime, byYear] = await Promise.all([
    computePeriodFinancials({ includeItems: false }),
    Promise.all(years.map((year) => getYearSummary(year))),
  ]);

  const currentYear = getCurrentLagosYear();

  return {
    generatedAt: new Date(),
    timeZone: LAGOS_TIMEZONE,
    currentYear,
    years,
    lifetime,
    byYear: byYear.sort((a, b) => b.year - a.year),
  };
};

module.exports = {
  getAuditYears,
  getYearlyAudit,
  getYearSummary,
  getAuditOverview,
  getCurrentLagosYear,
  getYearRange,
};
