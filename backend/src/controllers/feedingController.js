const { validationResult } = require("express-validator");

const feedingService = require("../services/feedingService");
const asyncHandler = require("../utils/asyncHandler");

const { successResponse, errorResponse } = require("../utils/apiResponse");

const requestMetadata = (req) => ({
  ipAddress:
    req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",

  userAgent: req.get("user-agent") || "",
});

const validateRequest = (req, res) => {
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

const createFeeding = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result = await feedingService.createFeeding({
    data: req.body,
    ...requestMetadata(req),
  });

  if (!result.success) {
    switch (result.reason) {
      case "POND_NOT_FOUND":
        return errorResponse(res, {
          statusCode: 404,
          message: "The selected pond was not found.",
        });

      case "POND_UNAVAILABLE":
        return errorResponse(res, {
          statusCode: 409,
          message:
            "Feeding cannot be recorded for a pond that is inactive or under maintenance.",
        });

      case "INSUFFICIENT_FEED":
        return errorResponse(res, {
          statusCode: 409,
          message: "There is not enough feed available in inventory.",
          errors: [
            {
              field: "quantityUsed",
              message: `Available quantity: ${result.available}.`,
            },
          ],
        });

      case "FEED_UNIT_MISMATCH":
        return errorResponse(res, {
          statusCode: 409,
          message:
            "The feeding quantity unit does not match the inventory unit.",
          errors: [
            {
              field: "quantityUnit",
              message: `Inventory uses "${result.inventoryUnit}" but feeding uses "${result.feedingUnit}".`,
            },
          ],
        });

      case "INVALID_QUANTITY":
        return errorResponse(res, {
          statusCode: 422,
          message: "Quantity used must be greater than zero.",
        });

      default:
        return errorResponse(res, {
          statusCode: 400,
          message: "Unable to record feeding.",
        });
    }
  }

  return successResponse(res, {
    statusCode: 201,
    message: "Feeding recorded successfully.",
    data: {
      feeding: result.feeding,
      remainingFeed: result.remainingFeed,
      inventoryUpdated: result.inventoryUpdated,
    },
  });
});

const listFeedings = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result = await feedingService.listFeedings({
    pond: req.query.pond,
    from: req.query.from,
    to: req.query.to,
    page: req.query.page,
    limit: req.query.limit,
  });

  return successResponse(res, {
    statusCode: 200,
    message: "Feeding records retrieved successfully.",
    data: result,
  });
});

const getFeeding = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const feeding = await feedingService.getFeedingById(req.params.id);

  if (!feeding) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Feeding record not found.",
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Feeding record retrieved successfully.",
    data: {
      feeding,
    },
  });
});

const getTodayConsumption = asyncHandler(async (req, res) => {
  const summary = await feedingService.getTodayConsumption();

  return successResponse(res, {
    statusCode: 200,
    message: "Today's feed consumption retrieved successfully.",
    data: {
      summary,
    },
  });
});

module.exports = {
  createFeeding,
  listFeedings,
  getFeeding,
  getTodayConsumption,
};
