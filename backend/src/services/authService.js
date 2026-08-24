const Admin = require("../models/Admin");
const ActivityLog = require("../models/ActivityLog");

const { comparePassword, hashPassword } = require("../utils/password");

const {
  createAccessToken,
  createResetToken,
  verifyResetToken,
} = require("../utils/token");

const env = require("../config/env");

const login = async ({ email, password, ipAddress, userAgent }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const admin = await Admin.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!admin || !admin.isActive) {
    return {
      success: false,
      reason: "INVALID_CREDENTIALS",
    };
  }

  const passwordMatches = await comparePassword(password, admin.password);

  if (!passwordMatches) {
    return {
      success: false,
      reason: "INVALID_CREDENTIALS",
    };
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  await ActivityLog.create({
    action: "login",
    entityType: "Admin",
    entityId: admin._id,
    description: "Administrator logged into the management system.",
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });

  return {
    success: true,
    admin: admin.toSafeObject(),
    token: createAccessToken(admin._id.toString(), admin.sessionVersion),
  };
};

const requestPasswordReset = async ({ email, ipAddress, userAgent }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const admin = await Admin.findOne({
    email: normalizedEmail,
  }).select("+resetPasswordTokenHash +resetPasswordExpiresAt");

  /*
   * The service deliberately returns the same external result
   * whether or not an account exists. This prevents account
   * enumeration through the password-reset endpoint.
   */
  if (!admin || !admin.isActive) {
    return {
      success: true,
      resetToken: null,
    };
  }

  const resetToken = createResetToken(admin._id.toString());

  /*
   * The JWT itself is not stored. A hash is stored so a database
   * leak does not expose a usable reset credential.
   */
  const crypto = require("crypto");

  admin.resetPasswordTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const resetTokenLifetimeMinutes = 15;

  admin.resetPasswordExpiresAt = new Date(
    Date.now() + resetTokenLifetimeMinutes * 60 * 1000,
  );

  await admin.save();

  await ActivityLog.create({
    action: "password_reset",
    entityType: "Admin",
    entityId: admin._id,
    description: "Administrator password reset was requested.",
    metadata: {
      stage: "request",
    },
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });

  return {
    success: true,
    resetToken,
  };
};

const resetPassword = async ({ token, password, ipAddress, userAgent }) => {
  let decodedToken;

  try {
    decodedToken = verifyResetToken(token);
  } catch (error) {
    return {
      success: false,
      reason: "INVALID_RESET_TOKEN",
    };
  }

  const crypto = require("crypto");

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const admin = await Admin.findById(decodedToken.sub).select(
    "+password +resetPasswordTokenHash +resetPasswordExpiresAt",
  );

  if (!admin || !admin.isActive) {
    return {
      success: false,
      reason: "INVALID_RESET_TOKEN",
    };
  }

  if (
    !admin.resetPasswordTokenHash ||
    admin.resetPasswordTokenHash !== tokenHash ||
    !admin.resetPasswordExpiresAt ||
    admin.resetPasswordExpiresAt.getTime() < Date.now()
  ) {
    return {
      success: false,
      reason: "INVALID_RESET_TOKEN",
    };
  }

  admin.password = await hashPassword(password);
  admin.passwordChangedAt = new Date();
  admin.sessionVersion = Number(admin.sessionVersion || 0) + 1;

  admin.resetPasswordTokenHash = null;
  admin.resetPasswordExpiresAt = null;

  await admin.save();

  await ActivityLog.create({
    action: "password_reset",
    entityType: "Admin",
    entityId: admin._id,
    description: "Administrator password was successfully reset.",
    metadata: {
      stage: "completed",
    },
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });

  return {
    success: true,
  };
};

const logout = async ({ admin, ipAddress, userAgent }) => {
  if (!admin) {
    return;
  }

  await ActivityLog.create({
    action: "logout",
    entityType: "Admin",
    entityId: admin._id,
    description: "Administrator logged out of the system.",
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });
};

const changePassword = async ({
  adminId,
  currentPassword,
  newPassword,
  ipAddress,
  userAgent,
}) => {
  const admin = await Admin.findById(adminId).select("+password");

  if (!admin || !admin.isActive) {
    return {
      success: false,
      reason: "ADMIN_NOT_FOUND",
    };
  }

  const currentPasswordMatches = await comparePassword(
    currentPassword,
    admin.password,
  );

  if (!currentPasswordMatches) {
    return {
      success: false,
      reason: "CURRENT_PASSWORD_INVALID",
    };
  }

  const newPasswordMatchesCurrent = await comparePassword(
    newPassword,
    admin.password,
  );

  if (newPasswordMatchesCurrent) {
    return {
      success: false,
      reason: "PASSWORD_UNCHANGED",
    };
  }

  admin.password = await hashPassword(newPassword);
  admin.passwordChangedAt = new Date();
  admin.sessionVersion = Number(admin.sessionVersion || 0) + 1;

  await admin.save();

  await ActivityLog.create({
    action: "password_change",
    entityType: "Admin",
    entityId: admin._id,
    description: "Administrator password was successfully changed.",
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });

  return {
    success: true,
  };
};

const getCurrentAdmin = async (adminId) => {
  const admin = await Admin.findById(adminId);

  if (!admin || !admin.isActive) {
    return null;
  }

  return admin.toSafeObject();
};
const updateProfile = async ({ adminId, data = {}, ipAddress, userAgent }) => {
  const admin = await Admin.findById(adminId);

  if (!admin || !admin.isActive) {
    return {
      success: false,
      reason: "ADMIN_NOT_FOUND",
    };
  }

  if (data.name !== undefined) {
    admin.name = String(data.name).trim();
  }

  if (data.phone !== undefined) {
    admin.phone = String(data.phone).trim();
  }

  if (data.bio !== undefined) {
    admin.bio = String(data.bio).trim();
  }

  await admin.save();

  await ActivityLog.create({
    action: "profile_update",
    entityType: "Admin",
    entityId: admin._id,
    description: "Administrator profile was successfully updated.",
    metadata: {
      fields: Object.keys(data),
    },
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });

  return {
    success: true,
    admin: admin.toSafeObject(),
  };
};

const updateAvatar = async ({ adminId, avatar, ipAddress, userAgent }) => {
  const admin = await Admin.findById(adminId);

  if (!admin || !admin.isActive) {
    return {
      success: false,
      reason: "ADMIN_NOT_FOUND",
    };
  }

  admin.avatar = {
    url: avatar?.url || "",
    publicId: avatar?.publicId || "",
  };

  await admin.save();

  await ActivityLog.create({
    action: "profile_update",
    entityType: "Admin",
    entityId: admin._id,
    description: "Administrator avatar was updated.",
    metadata: {
      publicId: admin.avatar.publicId,
    },
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });

  return {
    success: true,
    admin: admin.toSafeObject(),
  };
};

module.exports = {
  login,
  requestPasswordReset,
  resetPassword,
  logout,
  changePassword,
  getCurrentAdmin,
  updateProfile,
  updateAvatar,
};