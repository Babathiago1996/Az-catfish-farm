const mongoose = require("mongoose");

const Pond = require("../models/Pond");
const Stocking = require("../models/Stocking");

const saleService =
  require("./saleService");

const expenseService =
  require("./expenseService");

const mortalityService =
  require("./mortalityService");

const growthService =
  require("./growthService");

const REPORT_TIME_ZONE =
  "Africa/Lagos";

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

const startOfDay = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(23, 59, 59, 999);

  return date;
};

const buildDateRange = (from, to) => {
  if (!from && !to) {
    return {};
  }

  const filter = {};

  if (from) {
    const start = startOfDay(from);

    if (start) {
      filter.$gte = start;
    }
  }

  if (to) {
    const end = endOfDay(to);

    if (end) {
      filter.$lte = end;
    }
  }

  return filter;
};

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

const roundMoney = (value) => {
  return Number(
    (Number(value) || 0).toFixed(2),
  );
};

const roundWeight = (value) => {
  return Number(
    (Number(value) || 0).toFixed(3),
  );
};

/*
|--------------------------------------------------------------------------
| Lagos Date-Time Formatting
|--------------------------------------------------------------------------
|
| Returns an ISO-style timestamp with the Lagos UTC offset.
|
| Example:
| 2026-08-12T19:48:55.762+01:00
|--------------------------------------------------------------------------
*/

const formatLagosDateTime = (
  value = new Date(),
) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          REPORT_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hourCycle: "h23",
      },
    );

  const parts =
    formatter.formatToParts(date);

  const values = {};

  parts.forEach((part) => {
    values[part.type] =
      part.value;
  });

  return (
    `${values.year}-${values.month}-${values.day}` +
    `T${values.hour}:${values.minute}:${values.second}` +
    `.${values.fractionalSecond}` +
    "+01:00"
  );
};

/*
|--------------------------------------------------------------------------
| Pond Overview
|--------------------------------------------------------------------------
*/

const getPondOverview = async ({
  pond,
} = {}) => {
  const filter = {};

  if (pond) {
    if (
      !mongoose.isValidObjectId(
        pond,
      )
    ) {
      return {
        totalPonds: 0,
        activePonds: 0,
        inactivePonds: 0,
        totalFishCount: 0,
        totalBiomassKg: 0,
        ponds: [],
      };
    }

    filter._id = pond;
  }

  const ponds =
    await Pond.find(filter)
      .select(
        "name pondNumber pondType pondSize stockingDate currentFishCount currentAverageWeight waterSource status",
      )
      .sort({
        pondNumber: 1,
        name: 1,
      })
      .lean();

  const activePonds =
    ponds.filter(
      (item) =>
        item.status === "active",
    ).length;

  const inactivePonds =
    ponds.length - activePonds;

  const totalFishCount =
    ponds.reduce(
      (total, item) =>
        total +
        (Number(
          item.currentFishCount,
        ) || 0),
      0,
    );

  const totalBiomassKg =
    ponds.reduce(
      (total, item) => {
        const fishCount =
          Number(
            item.currentFishCount,
          ) || 0;

        const averageWeight =
          Number(
            item.currentAverageWeight,
          ) || 0;

        return (
          total +
          (fishCount *
            averageWeight) /
            1000
        );
      },
      0,
    );

  return {
    totalPonds:
      ponds.length,

    activePonds,

    inactivePonds,

    totalFishCount,

    totalBiomassKg:
      roundWeight(
        totalBiomassKg,
      ),

    ponds: ponds.map(
      (item) => {
        const fishCount =
          Number(
            item.currentFishCount,
          ) || 0;

        const averageWeight =
          Number(
            item.currentAverageWeight,
          ) || 0;

        return {
          _id: item._id,
          name: item.name,
          pondNumber:
            item.pondNumber,
          pondType:
            item.pondType,
          pondSize:
            item.pondSize,
          stockingDate:
            item.stockingDate,
          currentFishCount:
            fishCount,
          currentAverageWeight:
            averageWeight,
          currentBiomassKg:
            roundWeight(
              (fishCount *
                averageWeight) /
                1000,
            ),
          waterSource:
            item.waterSource,
          status:
            item.status,
        };
      },
    ),
  };
};

/*
|--------------------------------------------------------------------------
| Stocking Overview
|--------------------------------------------------------------------------
*/

const getStockingOverview = async ({
  pond,
  from,
  to,
} = {}) => {
  const filter = {};

  if (pond) {
    if (
      !mongoose.isValidObjectId(
        pond,
      )
    ) {
      return {
        totalStocked: 0,
        stockingRecords: 0,
      };
    }

    filter.pond =
      new mongoose.Types.ObjectId(
        pond,
      );
  }

  const dateRange =
    buildDateRange(
      from,
      to,
    );

  if (
    Object.keys(dateRange)
      .length > 0
  ) {
    filter.stockingDate =
      dateRange;
  }

  const aggregate =
    await Stocking.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,
          totalStocked: {
            $sum:
              "$fingerlingQuantity",
          },
          stockingRecords: {
            $sum: 1,
          },
        },
      },
    ]);

  return {
    totalStocked:
      aggregate[0]
        ?.totalStocked || 0,

    stockingRecords:
      aggregate[0]
        ?.stockingRecords || 0,
  };
};

/*
|--------------------------------------------------------------------------
| Sales Report
|--------------------------------------------------------------------------
*/

const getSalesReport = async ({
  from,
  to,
  pond,
} = {}) => {
  const sales =
    await saleService.getSalesSummary({
      from,
      to,
      pond,
    });

  return {
    totals: {
      totalSales:
        sales.totals
          ?.totalSales || 0,

      totalFishSold:
        sales.totals
          ?.totalFishSold || 0,

      totalWeightKg:
        roundWeight(
          sales.totals
            ?.totalWeightKg,
        ),

      totalRevenue:
        roundMoney(
          sales.totals
            ?.totalRevenue,
        ),

      totalCollected:
        roundMoney(
          sales.totals
            ?.totalCollected,
        ),

      totalOutstanding:
        roundMoney(
          sales.totals
            ?.totalOutstanding,
        ),
    },

    byDay:
      sales.byDay || [],

    byPaymentStatus:
      sales.byPaymentStatus || [],
  };
};

/*
|--------------------------------------------------------------------------
| Expense Report
|--------------------------------------------------------------------------
*/

const getExpenseReport = async ({
  from,
  to,
} = {}) => {
  const expenses =
    await expenseService.getExpenseSummary({
      from,
      to,
    });

  return {
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
  };
};

/*
|--------------------------------------------------------------------------
| Financial Report
|--------------------------------------------------------------------------
*/

const getFinancialReport = async ({
  from,
  to,
  pond,
} = {}) => {
  const [
    sales,
    expenses,
  ] = await Promise.all([
    getSalesReport({
      from,
      to,
      pond,
    }),

    getExpenseReport({
      from,
      to,
    }),
  ]);

  const revenue =
    roundMoney(
      sales.totals
        ?.totalRevenue,
    );

  const collected =
    roundMoney(
      sales.totals
        ?.totalCollected,
    );

  const outstanding =
    roundMoney(
      sales.totals
        ?.totalOutstanding,
    );

  const totalExpenses =
    roundMoney(
      expenses.totalExpenses,
    );

  const netRevenue =
    roundMoney(
      revenue -
        totalExpenses,
    );

  const netCollected =
    roundMoney(
      collected -
        totalExpenses,
    );

  return {
    revenue,

    collected,

    outstanding,

    totalExpenses,

    netRevenue,

    netCollected,

    salesCount:
      sales.totals
        ?.totalSales || 0,

    expenseCount:
      expenses.expenseCount || 0,

    currency: "NGN",
  };
};

/*
|--------------------------------------------------------------------------
| Production Report
|--------------------------------------------------------------------------
*/

const getProductionReport = async ({
  from,
  to,
  pond,
} = {}) => {
  const [
    pondOverview,
    stocking,
    mortality,
    growth,
    sales,
  ] = await Promise.all([
    getPondOverview({
      pond,
    }),

    getStockingOverview({
      pond,
      from,
      to,
    }),

    mortalityService.getMortalitySummary({
      pond,
      from,
      to,
    }),

    growthService.getGrowthAnalytics({
      pond,
      from,
      to,
      limit: 200,
    }),

    getSalesReport({
      from,
      to,
      pond,
    }),
  ]);

  const totalStocked =
    Number(
      stocking.totalStocked || 0,
    );

  const totalMortality =
    Number(
      mortality.totalMortality ||
        0,
    );

  const totalFishSold =
    Number(
      sales.totals
        ?.totalFishSold || 0,
    );

  /*
  |--------------------------------------------------------------------------
  | Survival Calculation
  |--------------------------------------------------------------------------
  |
  | Stocked - mortality - sales
  |
  | Example:
  | 1000 stocked
  | - 30 mortality
  | - 10 sold
  | = 960 remaining
  |--------------------------------------------------------------------------
  */

  const survivalCount =
    Math.max(
      totalStocked -
        totalMortality -
        totalFishSold,
      0,
    );

  const survivalRate =
    totalStocked > 0
      ? Number(
          (
            (survivalCount /
              totalStocked) *
            100
          ).toFixed(2),
        )
      : 0;

  return {
    ponds:
      pondOverview,

    stocking: {
      totalStocked,

      stockingRecords:
        stocking.stockingRecords ||
        0,
    },

    mortality: {
      totalMortality,

      records:
        mortality.records || 0,

      byPond:
        mortality.byPond || [],

      byCause:
        mortality.byCause || [],
    },

    sales: {
      totalFishSold,

      totalSales:
        sales.totals
          ?.totalSales || 0,

      totalWeightKg:
        roundWeight(
          sales.totals
            ?.totalWeightKg,
        ),

      totalRevenue:
        roundMoney(
          sales.totals
            ?.totalRevenue,
        ),
    },

    survival: {
      estimatedSurvivingFish:
        survivalCount,

      survivalRate,
    },

    growth: {
      chartData:
        growth.chartData || [],

      summary:
        growth.summary || [],

      totalRecords:
        growth.totalRecords || 0,
    },
  };
};

/*
|--------------------------------------------------------------------------
| Complete Farm Report
|--------------------------------------------------------------------------
*/

const getReport = async ({
  from,
  to,
  pond,
} = {}) => {
  const [
    financial,
    sales,
    expenses,
    production,
  ] = await Promise.all([
    getFinancialReport({
      from,
      to,
      pond,
    }),

    getSalesReport({
      from,
      to,
      pond,
    }),

    getExpenseReport({
      from,
      to,
    }),

    getProductionReport({
      from,
      to,
      pond,
    }),
  ]);

  return {
    generatedAt:
      formatLagosDateTime(
        new Date(),
      ),

    timeZone:
      REPORT_TIME_ZONE,

    period: {
      from:
        from || null,

      to:
        to || null,
    },

    filters: {
      pond:
        pond || null,
    },

    financial,

    sales,

    expenses,

    production,
  };
};

module.exports = {
  getReport,
  getFinancialReport,
  getSalesReport,
  getExpenseReport,
  getProductionReport,
  getPondOverview,
  getStockingOverview,
  startOfDay,
  endOfDay,
  buildDateRange,
  formatLagosDateTime,
  REPORT_TIME_ZONE,
};