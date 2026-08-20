const mongoose = require("mongoose");

const Pond = require("../models/Pond");
const Stocking = require("../models/Stocking");

const saleService = require("./saleService");
const expenseService = require("./expenseService");
const mortalityService = require("./mortalityService");
const growthService = require("./growthService");

const ANALYTICS_TIME_ZONE = "Africa/Lagos";

const roundMoney = (value) => {
  return Number((Number(value) || 0).toFixed(2));
};

const roundNumber = (value, decimals = 2) => {
  return Number(
    (Number(value) || 0).toFixed(decimals),
  );
};

const roundWeight = (value) => {
  return roundNumber(value, 3);
};

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

const getPondFilter = (pond) => {
  if (!pond) {
    return {};
  }

  if (!mongoose.isValidObjectId(pond)) {
    return null;
  }

  return {
    pond,
  };
};

const getPondKpis = async ({ pond } = {}) => {
  const filter = {};

  if (pond) {
    if (!mongoose.isValidObjectId(pond)) {
      return {
        totalPonds: 0,
        activePonds: 0,
        inactivePonds: 0,
        totalFishCount: 0,
        totalBiomassKg: 0,
      };
    }

    filter._id = pond;
  }

  const ponds = await Pond.find(filter)
    .select(
      "currentFishCount currentAverageWeight status",
    )
    .lean();

  const activePonds = ponds.filter(
    (item) => item.status === "active",
  ).length;

  const inactivePonds =
    ponds.length - activePonds;

  const totalFishCount = ponds.reduce(
    (total, item) =>
      total +
      (Number(item.currentFishCount) || 0),
    0,
  );

  const totalBiomassKg = ponds.reduce(
    (total, item) => {
      const fishCount =
        Number(item.currentFishCount) || 0;

      const averageWeight =
        Number(item.currentAverageWeight) || 0;

      return (
        total +
        (fishCount * averageWeight) / 1000
      );
    },
    0,
  );

  return {
    totalPonds: ponds.length,
    activePonds,
    inactivePonds,
    totalFishCount,
    totalBiomassKg:
      roundWeight(totalBiomassKg),
  };
};

const getStockingKpis = async ({
  pond,
  from,
  to,
} = {}) => {
  const filter = {};

  if (pond) {
    if (!mongoose.isValidObjectId(pond)) {
      return {
        totalStocked: 0,
        stockingRecords: 0,
      };
    }

    filter.pond =
      new mongoose.Types.ObjectId(pond);
  }

  const dateRange =
    buildDateRange(from, to);

  if (Object.keys(dateRange).length > 0) {
    filter.stockingDate = dateRange;
  }

  const result =
    await Stocking.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,
          totalStocked: {
            $sum: "$fingerlingQuantity",
          },
          stockingRecords: {
            $sum: 1,
          },
        },
      },
    ]);

  return {
    totalStocked:
      result[0]?.totalStocked || 0,

    stockingRecords:
      result[0]?.stockingRecords || 0,
  };
};

const getFinancialAnalytics = async ({
  from,
  to,
  pond,
} = {}) => {
  const [
    sales,
    expenses,
  ] = await Promise.all([
    saleService.getSalesSummary({
      from,
      to,
      pond,
    }),

    expenseService.getExpenseSummary({
      from,
      to,
    }),
  ]);

  const revenue = roundMoney(
    sales.totals?.totalRevenue,
  );

  const collected = roundMoney(
    sales.totals?.totalCollected,
  );

  const outstanding = roundMoney(
    sales.totals?.totalOutstanding,
  );

  const totalExpenses = roundMoney(
    expenses.totalExpenses,
  );

  const netRevenue = roundMoney(
    revenue - totalExpenses,
  );

  const netCollected = roundMoney(
    collected - totalExpenses,
  );

  return {
    revenue,
    collected,
    outstanding,
    totalExpenses,
    netRevenue,
    netCollected,
    salesCount:
      sales.totals?.totalSales || 0,
    expenseCount:
      expenses.expenseCount || 0,
    currency: "NGN",
  };
};

const getSalesAnalytics = async ({
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
        sales.totals?.totalSales || 0,

      totalFishSold:
        sales.totals?.totalFishSold || 0,

      totalWeightKg:
        roundWeight(
          sales.totals?.totalWeightKg,
        ),

      totalRevenue:
        roundMoney(
          sales.totals?.totalRevenue,
        ),

      totalCollected:
        roundMoney(
          sales.totals?.totalCollected,
        ),

      totalOutstanding:
        roundMoney(
          sales.totals?.totalOutstanding,
        ),
    },

    byDay:
      sales.byDay || [],

    byPaymentStatus:
      sales.byPaymentStatus || [],
  };
};

const getExpenseAnalytics = async ({
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

const getProductionAnalytics = async ({
  from,
  to,
  pond,
} = {}) => {
  const [
    pondKpis,
    stocking,
    mortality,
    growth,
  ] = await Promise.all([
    getPondKpis({
      pond,
    }),

    getStockingKpis({
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
  ]);

  const totalStocked =
    Number(stocking.totalStocked) || 0;

  const totalMortality =
    Number(mortality.totalMortality) || 0;

  const estimatedSurvivingFish =
    Math.max(
      totalStocked - totalMortality,
      0,
    );

  const survivalRate =
    totalStocked > 0
      ? roundNumber(
          (estimatedSurvivingFish /
            totalStocked) *
            100,
        )
      : 0;

  return {
    ponds: pondKpis,

    stocking: {
      totalStocked,
      stockingRecords:
        stocking.stockingRecords || 0,
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

    survival: {
      estimatedSurvivingFish,
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

const getDashboardAnalytics = async ({
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
    getFinancialAnalytics({
      from,
      to,
      pond,
    }),

    getSalesAnalytics({
      from,
      to,
      pond,
    }),

    getExpenseAnalytics({
      from,
      to,
    }),

    getProductionAnalytics({
      from,
      to,
      pond,
    }),
  ]);

  return {
    generatedAt: new Date(),

    timeZone:
      ANALYTICS_TIME_ZONE,

    period: {
      from: from || null,
      to: to || null,
    },

    filters: {
      pond: pond || null,
    },

    financial,

    sales,

    expenses,

    production,
  };
};

module.exports = {
  getDashboardAnalytics,
  getFinancialAnalytics,
  getSalesAnalytics,
  getExpenseAnalytics,
  getProductionAnalytics,
  getPondKpis,
  getStockingKpis,
  startOfDay,
  endOfDay,
  buildDateRange,
  ANALYTICS_TIME_ZONE,
};