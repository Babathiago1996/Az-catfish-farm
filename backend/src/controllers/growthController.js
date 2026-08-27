const { validationResult } = require("express-validator");

const growthService = require("../services/growthService");
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
        field: error.path,
        message: error.msg,
      })),
    });

    return false;
  }

  return true;
};

const createGrowthRecord = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await growthService.createGrowthRecord({
    data: req.body,
    ...getMetadata(req),
  });

  if (!result.success) {
    if (result.reason === "POND_NOT_FOUND") {
      return errorResponse(res, {
        statusCode: 404,
        message: "The selected pond was not found.",
      });
    }

    if (result.reason === "DUPLICATE_DATE") {
      return errorResponse(res, {
        statusCode: 409,
        message:
          "A growth record already exists for this pond on the selected date.",
      });
    }

    if (result.reason === "INVALID_DATE") {
      return errorResponse(res, {
        statusCode: 422,
        message: "The growth record date is invalid.",
      });
    }

    return errorResponse(res, {
      statusCode: 400,
      message: "Unable to create growth record.",
    });
  }

  return successResponse(res, {
    statusCode: 201,
    message: "Fish-growth record created successfully.",
    data: {
      record: result.record,
    },
  });
});

const listGrowthRecords = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await growthService.listGrowthRecords({
    pond: req.query.pond,
    from: req.query.from,
    to: req.query.to,
    page: req.query.page,
    limit: req.query.limit,
  });

  return successResponse(res, {
    statusCode: 200,
    message: "Fish-growth records retrieved successfully.",
    data: result,
  });
});

const getGrowthRecord = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const record = await growthService.getGrowthRecordById(req.params.id);

  if (!record) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Growth record not found.",
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Growth record retrieved successfully.",
    data: {
      record,
    },
  });
});

const updateGrowthRecord = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await growthService.updateGrowthRecord({
    id: req.params.id,
    data: req.body || {},
    ...getMetadata(req),
  });

  if (!result.success) {
    if (result.reason === "DUPLICATE_DATE") {
      return errorResponse(res, {
        statusCode: 409,
        message:
          "A growth record already exists for this pond on the selected date.",
      });
    }

    if (result.reason === "POND_NOT_FOUND") {
      return errorResponse(res, {
        statusCode: 404,
        message: "The selected pond was not found.",
      });
    }

    if (result.reason === "INVALID_DATE") {
      return errorResponse(res, {
        statusCode: 422,
        message: "Growth record date must be valid.",
      });
    }

    return errorResponse(res, {
      statusCode: 404,
      message: "Growth record not found.",
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Growth record updated successfully.",
    data: {
      record: result.record,
    },
  });
});

const deleteGrowthRecord = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await growthService.deleteGrowthRecord({
    id: req.params.id,
    ...getMetadata(req),
  });

  if (!result.success) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Growth record not found.",
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Growth record permanently deleted.",
    data: {
      record: result.record,
    },
  });
});

const getGrowthAnalytics = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const analytics = await growthService.getGrowthAnalytics({
    pond: req.query.pond,
    from: req.query.from,
    to: req.query.to,
    limit: req.query.limit,
  });

  return successResponse(res, {
    statusCode: 200,
    message: "Growth analytics retrieved successfully.",
    data: analytics,
  });
});

module.exports = {
  createGrowthRecord,
  listGrowthRecords,
  getGrowthRecord,
  updateGrowthRecord,
  deleteGrowthRecord,
  getGrowthAnalytics,
};