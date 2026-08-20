const { validationResult } = require("express-validator");

const pondService = require("../services/pondService");
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

const createPond = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result = await pondService.createPond({
    data: req.body,
    ...requestMetadata(req)
  });

  if (!result.success) {
    const duplicateMessages = {
      POND_NAME_EXISTS:
        "A pond with this name already exists.",
      POND_NUMBER_EXISTS:
        "A pond with this number already exists."
    };

    return errorResponse(res, {
      statusCode: 409,
      message:
        duplicateMessages[result.reason] ||
        "Unable to create pond."
    });
  }

  return successResponse(res, {
    statusCode: 201,
    message: "Pond created successfully.",
    data: {
      pond: result.pond
    }
  });
});

const listPonds = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result = await pondService.listPonds({
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
    status: req.query.status
  });

  return successResponse(res, {
    statusCode: 200,
    message: "Ponds retrieved successfully.",
    data: result
  });
});

const getPond = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const pond = await pondService.getPondById(
    req.params.id
  );

  if (!pond) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Pond not found."
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Pond retrieved successfully.",
    data: {
      pond
    }
  });
});

const updatePond = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result = await pondService.updatePond({
    pondId: req.params.id,
    data: req.body,
    ...requestMetadata(req)
  });

  const reasonMessages = {
    POND_NOT_FOUND: {
      statusCode: 404,
      message: "Pond not found."
    },

    POND_NAME_EXISTS: {
      statusCode: 409,
      message:
        "Another pond already uses this pond name."
    },

    POND_NUMBER_EXISTS: {
      statusCode: 409,
      message:
        "Another pond already uses this pond number."
    }
  };

  if (!result.success) {
    const response =
      reasonMessages[result.reason] || {
        statusCode: 400,
        message: "Unable to update pond."
      };

    return errorResponse(res, response);
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Pond updated successfully.",
    data: {
      pond: result.pond
    }
  });
});

const deletePond = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result = await pondService.deletePond({
    pondId: req.params.id,
    ...requestMetadata(req)
  });

  if (!result.success) {
    if (result.reason === "POND_NOT_FOUND") {
      return errorResponse(res, {
        statusCode: 404,
        message: "Pond not found."
      });
    }

    if (result.reason === "POND_HAS_HISTORY") {
      return errorResponse(res, {
        statusCode: 409,
        message:
          "This pond cannot be deleted because it has historical farm records.",
        errors: [
          {
            field: "pond",
            message: `${result.relatedRecords} related record(s) exist. Archive or mark the pond inactive instead.`
          }
        ]
      });
    }

    return errorResponse(res, {
      statusCode: 400,
      message: "Unable to delete pond."
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Pond deleted successfully."
  });
});

module.exports = {
  createPond,
  listPonds,
  getPond,
  updatePond,
  deletePond
};