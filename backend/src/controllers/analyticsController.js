const { validationResult } = require("express-validator");

const asyncHandler = require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

const analyticsService = require("../services/analyticsService");

const validate = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,
      message: "Please correct the highlighted fields.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });

    return false;
  }

  return true;
};

const getDashboardAnalytics = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const analytics =
      await analyticsService.getDashboardAnalytics({
        from: req.query.from,
        to: req.query.to,
        pond: req.query.pond,
      });

    return successResponse(res, {
      statusCode: 200,
      message: "Dashboard analytics retrieved successfully.",
      data: {
        analytics,
      },
    });
  },
);

const getFinancialAnalytics = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const financial =
      await analyticsService.getFinancialAnalytics({
        from: req.query.from,
        to: req.query.to,
        pond: req.query.pond,
      });

    return successResponse(res, {
      statusCode: 200,
      message: "Financial analytics retrieved successfully.",
      data: {
        financial,
      },
    });
  },
);

const getSalesAnalytics = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const sales =
      await analyticsService.getSalesAnalytics({
        from: req.query.from,
        to: req.query.to,
        pond: req.query.pond,
      });

    return successResponse(res, {
      statusCode: 200,
      message: "Sales analytics retrieved successfully.",
      data: {
        sales,
      },
    });
  },
);

const getExpenseAnalytics = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const expenses =
      await analyticsService.getExpenseAnalytics({
        from: req.query.from,
        to: req.query.to,
      });

    return successResponse(res, {
      statusCode: 200,
      message: "Expense analytics retrieved successfully.",
      data: {
        expenses,
      },
    });
  },
);

const getProductionAnalytics = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const production =
      await analyticsService.getProductionAnalytics({
        from: req.query.from,
        to: req.query.to,
        pond: req.query.pond,
      });

    return successResponse(res, {
      statusCode: 200,
      message: "Production analytics retrieved successfully.",
      data: {
        production,
      },
    });
  },
);

module.exports = {
  getDashboardAnalytics,
  getFinancialAnalytics,
  getSalesAnalytics,
  getExpenseAnalytics,
  getProductionAnalytics,
};