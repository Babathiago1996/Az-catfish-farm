const {
  validationResult,
} = require("express-validator");

const asyncHandler = require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

const expenseService =
  require("../services/expenseService");

const getMetadata = (req) => ({
  ipAddress:
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "",

  userAgent:
    req.get("user-agent") || "",
});

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

const createExpense = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const expense =
      await expenseService.createExpense({
        data: req.body,
        ...getMetadata(req),
      });

    return successResponse(res, {
      statusCode: 201,

      message:
        "Expense recorded successfully.",

      data: {
        expense,
      },
    });
  },
);

const listExpenses = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const result =
      await expenseService.listExpenses({
        category:
          req.query.category,

        from:
          req.query.from,

        to:
          req.query.to,

        search:
          req.query.search,

        page:
          req.query.page,

        limit:
          req.query.limit,
      });

    return successResponse(res, {
      statusCode: 200,

      message:
        "Expenses retrieved successfully.",

      data: result,
    });
  },
);

const getExpense = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const expense =
      await expenseService.getExpenseById(
        req.params.id,
      );

    if (!expense) {
      return errorResponse(res, {
        statusCode: 404,

        message:
          "Expense not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,

      message:
        "Expense retrieved successfully.",

      data: {
        expense,
      },
    });
  },
);

const updateExpense = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const result =
      await expenseService.updateExpense({
        id: req.params.id,

        data: req.body,

        ...getMetadata(req),
      });

    if (!result.success) {
      if (
        result.reason === "NOT_FOUND"
      ) {
        return errorResponse(res, {
          statusCode: 404,

          message:
            "Expense not found.",
        });
      }

      return errorResponse(res, {
        statusCode: 400,

        message:
          "Unable to update expense.",
      });
    }

    return successResponse(res, {
      statusCode: 200,

      message:
        "Expense updated successfully.",

      data: {
        expense:
          result.expense,
      },
    });
  },
);

const deleteExpense = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const result =
      await expenseService.deleteExpense({
        id: req.params.id,

        ...getMetadata(req),
      });

    if (!result.success) {
      if (
        result.reason === "NOT_FOUND"
      ) {
        return errorResponse(res, {
          statusCode: 404,

          message:
            "Expense not found.",
        });
      }

      return errorResponse(res, {
        statusCode: 400,

        message:
          "Unable to delete expense.",
      });
    }

    return successResponse(res, {
      statusCode: 200,

      message:
        "Expense deleted successfully.",
    });
  },
);

const getExpenseSummary =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const summary =
        await expenseService.getExpenseSummary(
          {
            from:
              req.query.from,

            to:
              req.query.to,

            category:
              req.query.category,
          },
        );

      return successResponse(res, {
        statusCode: 200,

        message:
          "Expense summary retrieved successfully.",

        data: {
          summary,
        },
      });
    },
  );

module.exports = {
  createExpense,
  listExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};