const {
  validationResult,
} = require("express-validator");

const asyncHandler = require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

const reportService =
  require("../services/reportService");

const validate = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,
      message:
        "Please correct the highlighted fields.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });

    return false;
  }

  return true;
};

/*
|--------------------------------------------------------------------------
| Complete Farm Report
|--------------------------------------------------------------------------
*/
const getReport = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const report =
      await reportService.getReport({
        from: req.query.from,
        to: req.query.to,
        pond: req.query.pond,
      });

    return successResponse(res, {
      statusCode: 200,
      message:
        "Farm report retrieved successfully.",
      data: {
        report,
      },
    });
  },
);

/*
|--------------------------------------------------------------------------
| Financial Report
|--------------------------------------------------------------------------
*/
const getFinancialReport = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const financial =
      await reportService.getFinancialReport({
        from: req.query.from,
        to: req.query.to,
        pond: req.query.pond,
      });

    return successResponse(res, {
      statusCode: 200,
      message:
        "Financial report retrieved successfully.",
      data: {
        financial,
      },
    });
  },
);

/*
|--------------------------------------------------------------------------
| Sales Report
|--------------------------------------------------------------------------
*/
const getSalesReport = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const sales =
      await reportService.getSalesReport({
        from: req.query.from,
        to: req.query.to,
        pond: req.query.pond,
      });

    return successResponse(res, {
      statusCode: 200,
      message:
        "Sales report retrieved successfully.",
      data: {
        sales,
      },
    });
  },
);

/*
|--------------------------------------------------------------------------
| Expense Report
|--------------------------------------------------------------------------
*/
const getExpenseReport = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const expenses =
      await reportService.getExpenseReport({
        from: req.query.from,
        to: req.query.to,
      });

    return successResponse(res, {
      statusCode: 200,
      message:
        "Expense report retrieved successfully.",
      data: {
        expenses,
      },
    });
  },
);

/*
|--------------------------------------------------------------------------
| Production Report
|--------------------------------------------------------------------------
*/
const getProductionReport = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const production =
      await reportService.getProductionReport({
        from: req.query.from,
        to: req.query.to,
        pond: req.query.pond,
      });

    return successResponse(res, {
      statusCode: 200,
      message:
        "Production report retrieved successfully.",
      data: {
        production,
      },
    });
  },
);

module.exports = {
  getReport,
  getFinancialReport,
  getSalesReport,
  getExpenseReport,
  getProductionReport,
};