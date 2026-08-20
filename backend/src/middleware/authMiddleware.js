const Admin = require("../models/Admin");
const { verifyAccessToken } = require("../utils/token");
const asyncHandler = require("../utils/asyncHandler");
const { errorResponse } = require("../utils/apiResponse");

/**
 * Extract Bearer token from Authorization header.
 *
 * Expected:
 * Authorization: Bearer <token>
 */
const getBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null;
  }

  const parts = authorizationHeader.trim().split(/\s+/);

  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  if (scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
};

/**
 * Protect authenticated routes.
 *
 * Responsibilities:
 * - Validate Bearer token
 * - Verify JWT
 * - Find administrator
 * - Check administrator status
 * - Validate sessionVersion
 * - Attach authenticated admin to req.admin
 * - Attach authentication metadata to req.auth
 */
const protect = asyncHandler(async (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  const token = getBearerToken(authorizationHeader);

  if (!token) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Authentication is required.",
    });
  }

  let decodedToken;

  try {
    decodedToken = verifyAccessToken(token);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, {
        statusCode: 401,
        message: "Your session has expired. Please log in again.",
      });
    }

    return errorResponse(res, {
      statusCode: 401,
      message: "Invalid authentication token.",
    });
  }

  /**
   * Ensure the JWT contains a valid administrator subject.
   */
  if (!decodedToken || !decodedToken.sub) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Invalid authentication token.",
    });
  }

  const admin = await Admin.findById(decodedToken.sub);

  if (!admin) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Administrator account not found.",
    });
  }

  /**
   * Account status check.
   */
  if (!admin.isActive) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Administrator account is inactive.",
    });
  }

  /**
   * Session invalidation check.
   *
   * When sessionVersion is incremented, all previously
   * issued access tokens become invalid.
   */
  const tokenSessionVersion = Number(
    decodedToken.sessionVersion || 0,
  );

  const adminSessionVersion = Number(
    admin.sessionVersion || 0,
  );

  if (tokenSessionVersion !== adminSessionVersion) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Session expired. Please log in again.",
    });
  }

  /**
   * Attach authenticated administrator.
   *
   * Controllers/services can use:
   * req.admin
   */
  req.admin = admin;

  /**
   * Attach authentication metadata.
   */
  req.auth = {
    adminId: admin._id.toString(),
    sessionVersion: adminSessionVersion,
    tokenType: decodedToken.type || "access",
  };

  next();
});

module.exports = {
  protect,
  getBearerToken,
};