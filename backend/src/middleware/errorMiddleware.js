const { errorResponse } = require("../utils/apiResponse");
const multer = require("multer");

const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error.";
  let errors = error.errors || null;

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed.";

    errors = Object.values(error.errors).map((validationError) => ({
      field: validationError.path,
      message: validationError.message,
    }));
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${error.path}.`;
  }

  if (error.code === 11000) {
    statusCode = 409;

    const duplicateFields = Object.keys(error.keyPattern || {});

    message =
      duplicateFields.length > 0
        ? `A record with the same ${duplicateFields.join(", ")} already exists.`
        : "A record with duplicate information already exists.";
  }

  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token.";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token has expired.";
  }

  if (error.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON request body.";
  }

  if (error.type === "entity.too.large") {
    statusCode = 413;
    message = "Request payload is too large.";
  }
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return errorResponse(res, {
        statusCode: 422,
        message: "Image file must not exceed 5 MB.",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return errorResponse(res, {
        statusCode: 422,
        message: "You can upload a maximum of 5 images at a time.",
      });
    }

    return errorResponse(res, {
      statusCode: 422,
      message: error.message,
    });
  }

  if (error.message === "Only JPEG, PNG, WebP, and GIF images are allowed.") {
    return errorResponse(res, {
      statusCode: 422,
      message: error.message,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  } else if (statusCode >= 500) {
    console.error(error);
  }

  return errorResponse(res, {
    statusCode,
    message,
    errors,
  });
};

module.exports = errorMiddleware;