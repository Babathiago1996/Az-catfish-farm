const {
  validationResult
} = require("express-validator");

const mortalityService = require("../services/mortalityService");
const asyncHandler = require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse
} = require("../utils/apiResponse");

const getMetadata = (req) => ({
  ipAddress:
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "",

  userAgent:
    req.get("user-agent") || ""
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
        message: error.msg
      }))
    });

    return false;
  }

  return true;
};

const createMortality =
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const result =
      await mortalityService.createMortality({
        data: req.body,
        ...getMetadata(req)
      });

    if (!result.success) {
      if (
        result.reason ===
        "QUANTITY_EXCEEDS_STOCK"
      ) {
        return errorResponse(res, {
          statusCode: 400,
          message:
            "Mortality quantity cannot exceed the current fish count in the pond."
        });
      }

      return errorResponse(res, {
        statusCode: 404,
        message:
          "The selected pond was not found."
      });
    }

    return successResponse(res, {
      statusCode: 201,
      message:
        "Mortality record created successfully.",
      data: {
        record: result.record,
        pond: result.pond
      }
    });
  });

const listMortality =
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const result =
      await mortalityService.listMortality({
        pond: req.query.pond,
        from: req.query.from,
        to: req.query.to,
        page: req.query.page,
        limit: req.query.limit
      });

    return successResponse(res, {
      statusCode: 200,
      message:
        "Mortality records retrieved successfully.",
      data: result
    });
  });

const getMortality =
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const record =
      await mortalityService.getMortalityById(
        req.params.id
      );

    if (!record) {
      return errorResponse(res, {
        statusCode: 404,
        message:
          "Mortality record not found."
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message:
        "Mortality record retrieved successfully.",
      data: {
        record
      }
    });
  });

const updateMortality =
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const result =
      await mortalityService.updateMortality({
        id: req.params.id,
        data: req.body,
        ...getMetadata(req)
      });

    if (!result.success) {
      if (
        result.reason ===
        "QUANTITY_EXCEEDS_STOCK"
      ) {
        return errorResponse(res, {
          statusCode: 400,
          message:
            "The updated mortality quantity exceeds the available fish stock."
        });
      }

      if (
        result.reason ===
        "POND_NOT_FOUND"
      ) {
        return errorResponse(res, {
          statusCode: 404,
          message:
            "The selected pond was not found."
        });
      }

      return errorResponse(res, {
        statusCode: 404,
        message:
          "Mortality record not found."
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message:
        "Mortality record updated successfully.",
      data: {
        record: result.record
      }
    });
  });

const getMortalitySummary =
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const summary =
      await mortalityService.getMortalitySummary({
        pond: req.query.pond,
        from: req.query.from,
        to: req.query.to
      });

    return successResponse(res, {
      statusCode: 200,
      message:
        "Mortality summary retrieved successfully.",
      data: {
        summary
      }
    });
  });

module.exports = {
  createMortality,
  listMortality,
  getMortality,
  updateMortality,
  getMortalitySummary
};