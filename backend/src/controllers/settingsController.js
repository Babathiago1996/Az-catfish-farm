const {
  validationResult,
} = require("express-validator");

const asyncHandler =
  require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

const settingsService =
  require("../services/settingsService");

const authService =
  require("../services/authService");

const getRequestMetadata = (req) => ({
  ipAddress:
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "",

  userAgent:
    req.get("user-agent") || "",
});

const validate = (
  req,
  res,
) => {
  const errors =
    validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,

      message:
        "Please correct the highlighted fields.",

      errors: errors.array().map(
        (error) => ({
          field: error.path,
          message: error.msg,
        }),
      ),
    });

    return false;
  }

  return true;
};

/*
|--------------------------------------------------------------------------
| Complete Settings
|--------------------------------------------------------------------------
*/

const getSettings =
  asyncHandler(
    async (req, res) => {
      const settings =
        await settingsService.getSettings(
          {
            adminId:
              req.auth.adminId,
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Farm settings retrieved successfully.",

          data: {
            settings,
          },
        },
      );
    },
  );

const updateSettings =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const farm =
        await settingsService.updateFarmSettings(
          {
            adminId:
              req.auth.adminId,

            data: req.body,

            ...getRequestMetadata(
              req,
            ),
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Farm settings updated successfully.",

          data: {
            farm,
          },
        },
      );
    },
  );

/*
|--------------------------------------------------------------------------
| Admin Profile
|--------------------------------------------------------------------------
*/

const getProfile =
  asyncHandler(
    async (req, res) => {
      const admin =
        await authService.getCurrentAdmin(
          req.auth.adminId,
        );

      if (!admin) {
        return errorResponse(
          res,
          {
            statusCode: 401,

            message:
              "Administrator account is unavailable.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Administrator profile retrieved successfully.",

          data: {
            profile: admin,
          },
        },
      );
    },
  );

const updateProfile =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await authService.updateProfile(
          {
            adminId:
              req.auth.adminId,

            data: req.body,

            ...getRequestMetadata(
              req,
            ),
          },
        );

      if (!result.success) {
        return errorResponse(
          res,
          {
            statusCode: 401,

            message:
              "Administrator account is unavailable.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Administrator profile updated successfully.",

          data: {
            profile:
              result.admin,
          },
        },
      );
    },
  );

const uploadAvatar =
  asyncHandler(
    async (req, res) => {
      if (!req.file) {
        return errorResponse(
          res,
          {
            statusCode: 400,

            message:
              "Avatar image is required.",
          },
        );
      }

      const cloudinary =
        require("../config/cloudinary");

      const oldAdmin =
        await authService.getCurrentAdmin(
          req.auth.adminId,
        );

      const uploadResult =
        await new Promise(
          (resolve, reject) => {
            const stream =
              cloudinary.uploader.upload_stream(
                {
                  folder:
                    "az-fish-farm/settings/admin-avatar",

                  resource_type:
                    "image",
                },

                (
                  error,
                  result,
                ) => {
                  if (error) {
                    return reject(
                      error,
                    );
                  }

                  resolve(result);
                },
              );

            stream.end(
              req.file.buffer,
            );
          },
        );

      if (
        !uploadResult?.secure_url ||
        !uploadResult?.public_id
      ) {
        return errorResponse(
          res,
          {
            statusCode: 502,

            message:
              "Avatar upload failed.",
          },
        );
      }

      const result =
        await authService.updateAvatar(
          {
            adminId:
              req.auth.adminId,

            avatar: {
              url:
                uploadResult.secure_url,

              publicId:
                uploadResult.public_id,
            },

            ...getRequestMetadata(
              req,
            ),
          },
        );

      if (!result.success) {
        try {
          await cloudinary.uploader.destroy(
            uploadResult.public_id,
            {
              resource_type:
                "image",

              invalidate: true,
            },
          );
        } catch (error) {
          console.error(
            "Avatar cleanup failed:",
            error,
          );
        }

        return errorResponse(
          res,
          {
            statusCode: 401,

            message:
              "Administrator account is unavailable.",
          },
        );
      }

      if (
        oldAdmin?.avatar?.publicId &&
        oldAdmin.avatar.publicId !==
          uploadResult.public_id
      ) {
        try {
          await cloudinary.uploader.destroy(
            oldAdmin.avatar.publicId,
            {
              resource_type:
                "image",

              invalidate: true,
            },
          );
        } catch (error) {
          console.error(
            "Old avatar deletion failed:",
            error,
          );
        }
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Administrator avatar updated successfully.",

          data: {
            profile:
              result.admin,
          },
        },
      );
    },
  );

/*
|--------------------------------------------------------------------------
| Account
|--------------------------------------------------------------------------
*/

const getAccount =
  asyncHandler(
    async (req, res) => {
      const admin =
        await authService.getCurrentAdmin(
          req.auth.adminId,
        );

      if (!admin) {
        return errorResponse(
          res,
          {
            statusCode: 401,

            message:
              "Administrator account is unavailable.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Account settings retrieved successfully.",

          data: {
            account: {
              email:
                admin.email,

              isActive:
                admin.isActive,

              lastLoginAt:
                admin.lastLoginAt,

              passwordChangedAt:
                admin.passwordChangedAt,

              createdAt:
                admin.createdAt,

              updatedAt:
                admin.updatedAt,
            },
          },
        },
      );
    },
  );

const changeEmail =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await authService.changeEmail(
          {
            adminId:
              req.auth.adminId,

            email:
              req.body.email,

            currentPassword:
              req.body.currentPassword,

            ...getRequestMetadata(
              req,
            ),
          },
        );

      const messages = {
        ADMIN_NOT_FOUND:
          "Administrator account is unavailable.",

        CURRENT_PASSWORD_INVALID:
          "The current password is incorrect.",

        EMAIL_UNCHANGED:
          "The new email is the same as the current email.",

        EMAIL_ALREADY_IN_USE:
          "That email address is already in use.",
      };

      if (!result.success) {
        const statusCode =
          result.reason ===
          "EMAIL_ALREADY_IN_USE"
            ? 409
            : result.reason ===
                "ADMIN_NOT_FOUND"
              ? 401
              : 400;

        return errorResponse(
          res,
          {
            statusCode,

            message:
              messages[
                result.reason
              ] ||
              "Unable to update account email.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Account email updated successfully. Please log in again.",

          data: {
            account: {
              email:
                result.admin.email,

              isActive:
                result.admin.isActive,
            },
          },
        },
      );
    },
  );

const changePassword =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await authService.changePassword(
          {
            adminId:
              req.auth.adminId,

            currentPassword:
              req.body.currentPassword,

            newPassword:
              req.body.newPassword,

            ...getRequestMetadata(
              req,
            ),
          },
        );

      const messages = {
        ADMIN_NOT_FOUND:
          "Administrator account is unavailable.",

        CURRENT_PASSWORD_INVALID:
          "The current password is incorrect.",

        PASSWORD_UNCHANGED:
          "The new password must be different from the current password.",
      };

      if (!result.success) {
        return errorResponse(
          res,
          {
            statusCode:
              result.reason ===
              "ADMIN_NOT_FOUND"
                ? 401
                : 400,

            message:
              messages[
                result.reason
              ] ||
              "Unable to change password.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Password changed successfully. Please log in again.",
        },
      );
    },
  );

const logout =
  asyncHandler(
    async (req, res) => {
      await authService.logout(
        {
          admin:
            req.admin,

          ...getRequestMetadata(
            req,
          ),
        },
      );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Logout successful.",
        },
      );
    },
  );

/*
|--------------------------------------------------------------------------
| Notifications
|--------------------------------------------------------------------------
*/

const getNotifications =
  asyncHandler(
    async (req, res) => {
      const settings =
        await settingsService.getOrCreateFarmSettings();

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Notification preferences retrieved successfully.",

          data: {
            notificationPreferences:
              settings.notificationPreferences,
          },
        },
      );
    },
  );

const updateNotifications =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const data =
        req.body.notificationPreferences ||
        req.body;

      const notificationPreferences =
        await settingsService.updateNotifications(
          {
            adminId:
              req.auth.adminId,

            data,

            ...getRequestMetadata(
              req,
            ),
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Notification preferences updated successfully.",

          data: {
            notificationPreferences,
          },
        },
      );
    },
  );

/*
|--------------------------------------------------------------------------
| Farm
|--------------------------------------------------------------------------
*/

const getFarm =
  asyncHandler(
    async (req, res) => {
      const settings =
        await settingsService.getOrCreateFarmSettings();

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Farm settings retrieved successfully.",

          data: {
            farm:
              settingsService.buildFarmSettings(
                settings,
              ),
          },
        },
      );
    },
  );

const updateFarm =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const farm =
        await settingsService.updateFarmSettings(
          {
            adminId:
              req.auth.adminId,

            data: req.body,

            ...getRequestMetadata(
              req,
            ),
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Farm settings updated successfully.",

          data: {
            farm,
          },
        },
      );
    },
  );

const uploadFarmLogo =
  asyncHandler(
    async (req, res) => {
      const farmLogo =
        await settingsService.updateFarmLogo(
          {
            adminId:
              req.auth.adminId,

            file:
              req.file,

            ...getRequestMetadata(
              req,
            ),
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Farm logo updated successfully.",

          data: {
            farmLogo,
          },
        },
      );
    },
  );

const removeFarmLogo =
  asyncHandler(
    async (req, res) => {
      const farmLogo =
        await settingsService.removeFarmLogo(
          {
            adminId:
              req.auth.adminId,

            ...getRequestMetadata(
              req,
            ),
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Farm logo removed successfully.",

          data: {
            farmLogo,
          },
        },
      );
    },
  );

/*
|--------------------------------------------------------------------------
| Feeding Schedule
|--------------------------------------------------------------------------
*/

const getFeedingSchedule =
  asyncHandler(
    async (req, res) => {
      const settings =
        await settingsService.getOrCreateFarmSettings();

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Feeding schedule retrieved successfully.",

          data: {
            feedingSchedule:
              settings.feedingSchedule,
          },
        },
      );
    },
  );

const updateFeedingSchedule =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const data =
        req.body.feedingSchedule ||
        req.body;

      const feedingSchedule =
        await settingsService.updateFeedingSchedule(
          {
            adminId:
              req.auth.adminId,

            data,

            ...getRequestMetadata(
              req,
            ),
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Feeding schedule updated successfully.",

          data: {
            feedingSchedule,
          },
        },
      );
    },
  );

module.exports = {
  getSettings,
  updateSettings,

  getProfile,
  updateProfile,
  uploadAvatar,

  getAccount,
  changeEmail,
  changePassword,
  logout,

  getNotifications,
  updateNotifications,

  getFarm,
  updateFarm,
  uploadFarmLogo,
  removeFarmLogo,

  getFeedingSchedule,
  updateFeedingSchedule,
};