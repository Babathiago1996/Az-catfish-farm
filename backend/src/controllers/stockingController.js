const { validationResult } = require("express-validator");

const stockingService = require("../services/stockingService");
const asyncHandler = require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse
} = require("../utils/apiResponse");

const requestMetadata = (req) => ({
  ipAddress:
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "",

  userAgent: req.get("user-agent") || ""
});

const validateRequest = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,
      message: "Please correct the highlighted fields.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg
      }))
    });

    return false;
  }

  return true;
};

const createStocking = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result =
    await stockingService.createStocking({
      data: req.body,
      ...requestMetadata(req)
    });

  const reasons = {
    POND_NOT_FOUND: {
      statusCode: 404,
      message: "The selected pond was not found."
    },

    POND_MAINTENANCE: {
      statusCode: 409,
      message:
        "Fish cannot be stocked into a pond currently under maintenance."
    }
  };

  if (!result.success) {
    return errorResponse(
      res,
      reasons[result.reason] || {
        statusCode: 400,
        message: "Unable to record stocking."
      }
    );
  }

  return successResponse(res, {
    statusCode: 201,
    message:
      "Stocking recorded and pond fish count updated successfully.",
    data: {
      stocking: result.stocking,
      pond: result.pond
    }
  });
});

const listStocking = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result =
    await stockingService.listStocking({
      pond: req.query.pond,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      limit: req.query.limit
    });

  return successResponse(res, {
    statusCode: 200,
    message: "Stocking records retrieved successfully.",
    data: result
  });
});

const getStocking = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const record =
    await stockingService.getStockingById(
      req.params.id
    );

  if (!record) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Stocking record not found."
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Stocking record retrieved successfully.",
    data: {
      stocking: record
    }
  });
});

const updateStocking = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result =
    await stockingService.updateStocking({
      id: req.params.id,
      data: req.body,
      ...requestMetadata(req)
    });

  const reasons = {
    NOT_FOUND: {
      statusCode: 404,
      message: "Stocking record not found."
    },

    POND_NOT_FOUND: {
      statusCode: 404,
      message: "The selected pond was not found."
    },

    INVALID_QUANTITY: {
      statusCode: 422,
      message: "Fingerling quantity must be at least 1."
    },

    INVALID_COST: {
      statusCode: 422,
      message: "Stocking cost cannot be negative."
    }
  };

  if (!result.success) {
    return errorResponse(
      res,
      reasons[result.reason] || {
        statusCode: 400,
        message: "Unable to update stocking record."
      }
    );
  }

  return successResponse(res, {
    statusCode: 200,
    message:
      "Stocking record updated and pond fish count adjusted successfully.",
    data: {
      stocking: result.stocking
    }
  });
});

const deleteStocking = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result =
    await stockingService.deleteStocking({
      id: req.params.id,
      ...requestMetadata(req)
    });

  if (!result.success) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Stocking record not found."
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message:
      "Stocking record deleted and pond fish count restored successfully.",
    data: {
      stocking: result.stocking
    }
  });
});

module.exports = {
  createStocking,
  listStocking,
  getStocking,
  updateStocking,
  deleteStocking
};