const { validationResult } = require("express-validator");

const waterManagementService = require("../services/waterManagementService");

const asyncHandler = require("../utils/asyncHandler");

const { successResponse, errorResponse } = require("../utils/apiResponse");

const metadata = (req) => ({
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

const createWaterManagement = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await waterManagementService.createWaterManagement({
    data: req.body,
    ...metadata(req),
  });

  if (!result.success) {
    if (result.reason === "POND_NOT_FOUND") {
      return errorResponse(res, {
        statusCode: 404,
        message: "The selected pond was not found.",
      });
    }

    return errorResponse(res, {
      statusCode: 400,
      message: "Unable to save water-management information.",
    });
  }
  return successResponse(res, {
    statusCode: result.created ? 201 : 200,
    message: result.created
      ? "Water-management information created successfully."
      : "Water-management information updated successfully.",
    data: {
      waterManagement: result.record,
    },
  });
});

const listWaterManagement = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await waterManagementService.listWaterManagement({
    pond: req.query.pond,
    status: req.query.status,
    from: req.query.from,
    to: req.query.to,
    page: req.query.page,
    limit: req.query.limit,
  });

  return successResponse(res, {
    statusCode: 200,
    message: "Water-management records retrieved successfully.",
    data: result,
  });
});

const getWaterManagement = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const record = await waterManagementService.getWaterManagementById(
    req.params.id,
  );

  if (!record) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Water-management record not found.",
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Water-management record retrieved successfully.",
    data: {
      waterManagement: record,
    },
  });
});

const updateWaterManagement = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await waterManagementService.updateWaterManagement({
    id: req.params.id,
    data: req.body,
    ...metadata(req),
  });

  if (!result.success) {
    if (result.reason === "POND_NOT_FOUND") {
      return errorResponse(res, {
        statusCode: 404,
        message: "The selected pond was not found.",
      });
    }

    return errorResponse(res, {
      statusCode: 404,
      message: "Water-management record not found.",
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Water-management information updated successfully.",
    data: {
      waterManagement: result.record,
    },
  });
});

const recordWaterChange = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await waterManagementService.recordWaterChange({
    id: req.params.id,
    nextWaterChange: req.body.nextWaterChange,
    waterQualityNotes: req.body.waterQualityNotes,
    waterParameters: req.body.waterParameters,
    pumpStatus: req.body.pumpStatus,
    electricityStatus: req.body.electricityStatus,
    notes: req.body.notes,
    ...metadata(req),
  });

  if (!result.success) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Water-management record not found.",
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Water change recorded successfully.",
    data: {
      waterManagement: result.record,
    },
  });
});

const getWaterChangeSummary = asyncHandler(async (req, res) => {
  const summary = await waterManagementService.getWaterChangeSummary();

  return successResponse(res, {
    statusCode: 200,
    message: "Water-change summary retrieved successfully.",
    data: {
      summary,
    },
  });
});

module.exports = {
  createWaterManagement,
  listWaterManagement,
  getWaterManagement,
  updateWaterManagement,
  recordWaterChange,
  getWaterChangeSummary,
};
