const {
  validationResult,
} = require("express-validator");

const asyncHandler =
  require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

const dashboardService =
  require("../services/dashboardService");

const validate = (req, res) => {
  const errors =
    validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,

      message:
        "Please correct the highlighted fields.",

      errors: errors
        .array()
        .map((error) => ({
          field: error.path,
          message: error.msg,
        })),
    });

    return false;
  }

  return true;
};

const getDashboard =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await dashboardService.getDashboard(
          {
            from:
              req.query.from,

            to:
              req.query.to,

            pond:
              req.query.pond,

            activityLimit:
              req.query.activityLimit,
          },
        );

      if (
        result &&
        result.success === false
      ) {
        if (
          result.reason ===
          "INVALID_POND_ID"
        ) {
          return errorResponse(res, {
            statusCode: 422,

            message:
              "Pond must be a valid ID.",
          });
        }

        return errorResponse(res, {
          statusCode: 400,

          message:
            "Unable to retrieve dashboard data.",
        });
      }

      return successResponse(res, {
        statusCode: 200,

        message:
          "Dashboard data retrieved successfully.",

        data: {
          dashboard: result,
        },
      });
    },
  );

module.exports = {
  getDashboard,
};