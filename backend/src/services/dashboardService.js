const mongoose = require("mongoose");

const ActivityLog = require("../models/ActivityLog");
const Inventory = require("../models/Inventory");

const reportService = require("./reportService");

const DASHBOARD_TIME_ZONE = "Africa/Lagos";

const roundMoney = (value) => {
  return Number((Number(value) || 0).toFixed(2));
};

const roundWeight = (value) => {
  return Number((Number(value) || 0).toFixed(3));
};

const getInventoryOverview = async () => {
  const items = await Inventory.find({
    reorderLevel: {
      $gt: 0,
    },
  })
    .select(
      "name category quantity unit reorderLevel unitCost lastRestockedAt",
    )
    .sort({
      category: 1,
      name: 1,
    })
    .lean();

  const lowStockItems = items.filter((item) => {
    const quantity = Number(item.quantity) || 0;
    const reorderLevel =
      Number(item.reorderLevel) || 0;

    return quantity <= reorderLevel;
  });

  const outOfStockItems = items.filter((item) => {
    return (Number(item.quantity) || 0) <= 0;
  });

  const totalInventoryItems =
    await Inventory.countDocuments();

  return {
    totalItems: totalInventoryItems,

    lowStockCount:
      lowStockItems.length,

    outOfStockCount:
      outOfStockItems.length,

    lowStockItems:
      lowStockItems.map((item) => ({
        _id: item._id,
        name: item.name,
        category: item.category,
        quantity:
          Number(item.quantity) || 0,
        unit: item.unit,
        reorderLevel:
          Number(item.reorderLevel) || 0,
        unitCost:
          roundMoney(item.unitCost),
        lastRestockedAt:
          item.lastRestockedAt || null,
      })),
  };
};

const getRecentActivities = async ({
  limit = 10,
} = {}) => {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    50,
  );

  const activities =
    await ActivityLog.find({})
      .sort({
        createdAt: -1,
      })
      .limit(safeLimit)
      .select(
        "action entityType entityId description metadata ipAddress userAgent createdAt",
      )
      .lean();

  return activities.map((activity) => ({
    _id: activity._id,

    action:
      activity.action || "",

    entityType:
      activity.entityType || "",

    entityId:
      activity.entityId || null,

    description:
      activity.description || "",

    metadata:
      activity.metadata || {},

    createdAt:
      activity.createdAt || null,
  }));
};

const getDashboard = async ({
  from,
  to,
  pond,
  activityLimit = 10,
} = {}) => {
  if (
    pond &&
    !mongoose.isValidObjectId(pond)
  ) {
    return {
      success: false,
      reason: "INVALID_POND_ID",
    };
  }

  const [
    report,
    inventory,
    recentActivities,
  ] = await Promise.all([
    reportService.getReport({
      from,
      to,
      pond,
    }),

    getInventoryOverview(),

    getRecentActivities({
      limit: activityLimit,
    }),
  ]);

  const financial =
    report.financial || {};

  const sales =
    report.sales || {};

  const expenses =
    report.expenses || {};

  const production =
    report.production || {};

  const pondOverview =
    production.ponds || {};

  const stocking =
    production.stocking || {};

  const mortality =
    production.mortality || {};

  const survival =
    production.survival || {};

  const growth =
    production.growth || {};

  const salesTotals =
    sales.totals || {};

  return {
    generatedAt:
      report.generatedAt ||
      new Date(),

    timeZone:
      report.timeZone ||
      DASHBOARD_TIME_ZONE,

    period:
      report.period || {
        from: from || null,
        to: to || null,
      },

    filters:
      report.filters || {
        pond: pond || null,
      },

    overview: {
      ponds: {
        total:
          pondOverview.totalPonds || 0,

        active:
          pondOverview.activePonds || 0,

        inactive:
          pondOverview.inactivePonds || 0,
      },

      fish: {
        currentCount:
          pondOverview.totalFishCount || 0,

        biomassKg:
          roundWeight(
            pondOverview.totalBiomassKg,
          ),

        stocked:
          stocking.totalStocked || 0,

        mortality:
          mortality.totalMortality || 0,

        estimatedSurviving:
          survival.estimatedSurvivingFish ||
          0,

        survivalRate:
          Number(
            survival.survivalRate || 0,
          ),
      },

      financial: {
        revenue:
          roundMoney(
            financial.revenue,
          ),

        collected:
          roundMoney(
            financial.collected,
          ),

        outstanding:
          roundMoney(
            financial.outstanding,
          ),

        expenses:
          roundMoney(
            financial.totalExpenses,
          ),

        netRevenue:
          roundMoney(
            financial.netRevenue,
          ),

        netCollected:
          roundMoney(
            financial.netCollected,
          ),

        currency:
          financial.currency || "NGN",
      },

      sales: {
        count:
          salesTotals.totalSales || 0,

        fishSold:
          salesTotals.totalFishSold || 0,

        weightKg:
          roundWeight(
            salesTotals.totalWeightKg,
          ),

        revenue:
          roundMoney(
            salesTotals.totalRevenue,
          ),

        collected:
          roundMoney(
            salesTotals.totalCollected,
          ),

        outstanding:
          roundMoney(
            salesTotals.totalOutstanding,
          ),
      },

      expenses: {
        count:
          expenses.expenseCount || 0,

        total:
          roundMoney(
            expenses.totalExpenses,
          ),
      },

      inventory: {
        totalItems:
          inventory.totalItems || 0,

        lowStock:
          inventory.lowStockCount || 0,

        outOfStock:
          inventory.outOfStockCount || 0,
      },

      growth: {
        totalRecords:
          growth.totalRecords || 0,

        latest:
          Array.isArray(
            growth.summary,
          ) && growth.summary.length > 0
            ? growth.summary[0]
            : null,
      },
    },

    financial: {
      revenue:
        roundMoney(
          financial.revenue,
        ),

      collected:
        roundMoney(
          financial.collected,
        ),

      outstanding:
        roundMoney(
          financial.outstanding,
        ),

      totalExpenses:
        roundMoney(
          financial.totalExpenses,
        ),

      netRevenue:
        roundMoney(
          financial.netRevenue,
        ),

      netCollected:
        roundMoney(
          financial.netCollected,
        ),

      currency:
        financial.currency || "NGN",
    },

    sales: {
      totals: {
        totalSales:
          salesTotals.totalSales || 0,

        totalFishSold:
          salesTotals.totalFishSold || 0,

        totalWeightKg:
          roundWeight(
            salesTotals.totalWeightKg,
          ),

        totalRevenue:
          roundMoney(
            salesTotals.totalRevenue,
          ),

        totalCollected:
          roundMoney(
            salesTotals.totalCollected,
          ),

        totalOutstanding:
          roundMoney(
            salesTotals.totalOutstanding,
          ),
      },

      byDay:
        sales.byDay || [],

      byPaymentStatus:
        sales.byPaymentStatus || [],
    },

    expenses: {
      totalExpenses:
        roundMoney(
          expenses.totalExpenses,
        ),

      expenseCount:
        expenses.expenseCount || 0,

      byCategory:
        expenses.byCategory || [],

      byMonth:
        expenses.byMonth || [],

      byDay:
        expenses.byDay || [],
    },

    production: {
      ponds: pondOverview,

      stocking,

      mortality,

      survival,

      growth,
    },

    inventory,

    charts: {
      salesByDay:
        sales.byDay || [],

      expensesByDay:
        expenses.byDay || [],

      expensesByCategory:
        expenses.byCategory || [],

      expensesByMonth:
        expenses.byMonth || [],

      growth:
        growth.chartData || [],
    },

    recentActivities,
  };
};

module.exports = {
  getDashboard,
  getInventoryOverview,
  getRecentActivities,
  DASHBOARD_TIME_ZONE,
};