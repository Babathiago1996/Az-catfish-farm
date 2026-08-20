const asyncHandler = (handler) => {
  return function asyncMiddleware(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;