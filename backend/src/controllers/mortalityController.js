const { validationResult } = require("express-validator");

const mortalityService = require("../services/mortalityService");

const asyncHandler = require("../utils/asyncHandler");

const { successResponse, errorResponse } = require("../utils/apiResponse");

const getMetadata = (req) => ({
  ipAddress:
    req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",

  userAgent: req.get("user-agent") || "",
});

const validate = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,

      message: "Please correct the highlighted fields.",

      errors: errors.array().map((error) => ({
        field: error.path || error.param,

        message: error.msg,
      })),
    });

    return false;
  }

  return true;
};

/**
 * CREATE
 */
const createMortality = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await mortalityService.createMortality({
    data: req.body,

    files: req.files,

    ...getMetadata(req),
  });

  if (!result.success) {
    switch (result.reason) {
      case "QUANTITY_EXCEEDS_STOCK":
        return errorResponse(res, {
          statusCode: 400,

          message:
            "Mortality quantity cannot exceed the current fish count in the pond.",
        });

      case "POND_NOT_FOUND":
        return errorResponse(res, {
          statusCode: 404,

          message: "The selected pond was not found.",
        });

      case "INVALID_DATE":
        return errorResponse(res, {
          statusCode: 422,

          message: "Please provide a valid mortality date.",
        });

      case "INVALID_QUANTITY":
        return errorResponse(res, {
          statusCode: 422,

          message:
            "Mortality quantity must be a whole number greater than zero.",
        });

      default:
        return errorResponse(res, {
          statusCode: 400,

          message: "Unable to create the mortality record.",
        });
    }
  }

  return successResponse(res, {
    statusCode: 201,

    message: "Mortality record created successfully.",

    data: {
      record: result.record,
      pond: result.pond,
    },
  });
});

/**
 * LIST
 */
const listMortality = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await mortalityService.listMortality({
    pond: req.query.pond,
    from: req.query.from,
    to: req.query.to,
    page: req.query.page,
    limit: req.query.limit,
  });

  return successResponse(res, {
    statusCode: 200,

    message: "Mortality records retrieved successfully.",

    data: result,
  });
});

/**
 * GET ONE
 */
const getMortality = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const record = await mortalityService.getMortalityById(req.params.id);

  if (!record) {
    return errorResponse(res, {
      statusCode: 404,

      message: "Mortality record not found.",
    });
  }

  return successResponse(res, {
    statusCode: 200,

    message: "Mortality record retrieved successfully.",

    data: {
      record,
    },
  });
});

/**
 * UPDATE
 */
const updateMortality = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const removeImage =
    req.body.removeImage === "true" || req.body.removeImage === true;

  const result = await mortalityService.updateMortality({
    id: req.params.id,

    data: req.body,

    files: req.files,

    removeImage,

    ...getMetadata(req),
  });

  if (!result.success) {
    switch (result.reason) {
      case "QUANTITY_EXCEEDS_STOCK":
        return errorResponse(res, {
          statusCode: 400,

          message:
            "The updated mortality quantity exceeds the available fish stock.",
        });

      case "POND_NOT_FOUND":
        return errorResponse(res, {
          statusCode: 404,

          message: "The selected pond was not found.",
        });

      case "INVALID_DATE":
        return errorResponse(res, {
          statusCode: 422,

          message: "Please provide a valid mortality date.",
        });

      case "INVALID_QUANTITY":
        return errorResponse(res, {
          statusCode: 422,

          message:
            "Mortality quantity must be a whole number greater than zero.",
        });

      default:
        return errorResponse(res, {
          statusCode: 404,

          message: "Mortality record not found.",
        });
    }
  }

  return successResponse(res, {
    statusCode: 200,

    message: "Mortality record updated successfully.",

    data: {
      record: result.record,
    },
  });
});

const deleteMortality = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await mortalityService.deleteMortality({
    id: req.params.id,

    ...getMetadata(req),
  });

  if (!result.success) {
    return errorResponse(res, {
      statusCode: 404,

      message: "Mortality record not found.",
    });
  }

  return successResponse(res, {
    statusCode: 200,

    message: "Mortality record permanently deleted.",

    data: {
      record: result.record,
    },
  });
});

/**
 * SUMMARY
 */
const getMortalitySummary = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const summary = await mortalityService.getMortalitySummary({
    pond: req.query.pond,
    from: req.query.from,
    to: req.query.to,
  });

  return successResponse(res, {
    statusCode: 200,

    message: "Mortality summary retrieved successfully.",

    data: {
      summary,
    },
  });
});

module.exports = {
  createMortality,
  listMortality,
  getMortality,
  updateMortality,
  deleteMortality,
  getMortalitySummary,
};
