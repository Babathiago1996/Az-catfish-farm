const {
  validationResult,
} = require("express-validator");

const asyncHandler =
  require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

const dailyActivityService =
  require("../services/dailyActivityService");

const validate = (
  req,
  res,
) => {
  const errors =
    validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,
      message:
        "Please correct the highlighted fields.",
      errors: errors.array().map(
        (error) => ({
          field: error.path,
          message: error.msg,
        }),
      ),
    });

    return false;
  }

  return true;
};

const createActivity =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await dailyActivityService.createActivity(
          {
            data: req.body,
            adminId:
              req.auth.adminId,
          },
        );

      if (!result.success) {
        if (
          result.reason ===
          "POND_NOT_FOUND"
        ) {
          return errorResponse(
            res,
            {
              statusCode: 404,
              message:
                "The selected pond was not found.",
            },
          );
        }

        return errorResponse(res, {
          statusCode: 400,
          message:
            "Unable to create daily activity.",
        });
      }

      return successResponse(
        res,
        {
          statusCode: 201,
          message:
            "Daily activity created successfully.",
          data: {
            activity:
              result.activity,
          },
        },
      );
    },
  );

const getActivities =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await dailyActivityService.getActivities(
          {
            from: req.query.from,
            to: req.query.to,
            pond: req.query.pond,
            type: req.query.type,
            period:
              req.query.period,
            completed:
              req.query.completed,
            page:
              req.query.page,
            limit:
              req.query.limit,
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "Daily activities retrieved successfully.",
          data: result,
        },
      );
    },
  );

const getActivity =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await dailyActivityService.getActivity(
          req.params.id,
        );

      if (!result.success) {
        return errorResponse(res, {
          statusCode: 404,
          message:
            "Daily activity not found.",
        });
      }

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "Daily activity retrieved successfully.",
          data: {
            activity:
              result.activity,
          },
        },
      );
    },
  );

const updateActivity =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await dailyActivityService.updateActivity(
          {
            activityId:
              req.params.id,
            data: req.body,
          },
        );

      if (
        result.reason ===
        "ACTIVITY_NOT_FOUND"
      ) {
        return errorResponse(res, {
          statusCode: 404,
          message:
            "Daily activity not found.",
        });
      }

      if (
        result.reason ===
        "POND_NOT_FOUND"
      ) {
        return errorResponse(res, {
          statusCode: 404,
          message:
            "The selected pond was not found.",
        });
      }

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "Daily activity updated successfully.",
          data: {
            activity:
              result.activity,
          },
        },
      );
    },
  );

const deleteActivity =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await dailyActivityService.deleteActivity(
          req.params.id,
        );

      if (!result.success) {
        return errorResponse(res, {
          statusCode: 404,
          message:
            "Daily activity not found.",
        });
      }

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "Daily activity deleted successfully.",
        },
      );
    },
  );

const getDailySummary =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const summary =
        await dailyActivityService.getDailySummary(
          {
            date: req.query.date,
            pond: req.query.pond,
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "Daily activity summary retrieved successfully.",
          data: {
            summary,
          },
        },
      );
    },
  );

module.exports = {
  createActivity,
  getActivities,
  getActivity,
  updateActivity,
  deleteActivity,
  getDailySummary,
};