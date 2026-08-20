const { validationResult } = require("express-validator");

const authService = require("../services/authService");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse
} = require("../utils/apiResponse");

const getRequestMetadata = (req) => ({
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

const login = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
    ...getRequestMetadata(req)
  });

  if (!result.success) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Invalid email or password."
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Login successful.",
    data: {
      admin: result.admin,
      token: result.token
    }
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result = await authService.requestPasswordReset({
    email: req.body.email,
    ...getRequestMetadata(req)
  });

  /*
   * In production the actual email delivery will be performed
   * by the notification/email service. For local development,
   * the reset token is intentionally not returned through the
   * public API.
   */
  void result;

  return successResponse(res, {
    statusCode: 200,
    message:
      "If an administrator account exists for that email, a password reset message has been sent."
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const result = await authService.resetPassword({
    token: req.body.token,
    password: req.body.password,
    ...getRequestMetadata(req)
  });

  if (!result.success) {
    return errorResponse(res, {
      statusCode: 400,
      message:
        "The password reset link is invalid or has expired."
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message:
      "Password reset successful. You can now log in with your new password."
  });
});

const getMe = asyncHandler(async (req, res) => {
  const admin = await authService.getCurrentAdmin(
    req.auth.adminId
  );

  if (!admin) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Administrator account is unavailable."
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Administrator profile retrieved.",
    data: {
      admin
    }
  });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout({
    admin: req.admin,
    ...getRequestMetadata(req)
  });

  return successResponse(res, {
    statusCode: 200,
    message: "Logout successful."
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return errorResponse(res, {
      statusCode: 422,
      message: "Please correct the highlighted fields.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg
      }))
    });
  }

  const result = await authService.changePassword({
    adminId: req.auth.adminId,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
    ...getRequestMetadata(req)
  });

  if (!result.success) {
    const responseMap = {
      ADMIN_NOT_FOUND: {
        statusCode: 401,
        message: "Administrator account is unavailable."
      },

      CURRENT_PASSWORD_INVALID: {
        statusCode: 400,
        message: "The current password is incorrect."
      },

      PASSWORD_UNCHANGED: {
        statusCode: 400,
        message:
          "The new password must be different from the current password."
      }
    };

    const response =
      responseMap[result.reason] || {
        statusCode: 400,
        message: "Unable to change password."
      };

    return errorResponse(res, response);
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Password changed successfully."
  });
});

module.exports = {
  login,
  forgotPassword,
  resetPassword,
  getMe,
  logout,
  changePassword
};