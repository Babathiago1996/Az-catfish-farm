const successResponse = (
  res,
  {
    statusCode = 200,
    message = "Request successful.",
    data = null,
    meta = null
  } = {}
) => {
  const response = {
    success: true,
    message,
    data
  };

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

const errorResponse = (
  res,
  {
    statusCode = 500,
    message = "An unexpected error occurred.",
    errors = null
  } = {}
) => {
  const response = {
    success: false,
    message
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  errorResponse
};