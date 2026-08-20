const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const controller =
  require("../controllers/settingsController");

const {
  updateSettingsValidator,
  profileValidators,
  accountEmailValidators,
  changePasswordValidators,
  notificationValidators,
  feedingValidators,
  farmValidators,
} = require("../validators/settingsValidators");

const router =
  express.Router();

router.use(protect);

/*
|--------------------------------------------------------------------------
| Complete Settings
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  controller.getSettings,
);

router.patch(
  "/",
  updateSettingsValidator,
  controller.updateSettings,
);

/*
|--------------------------------------------------------------------------
| Admin Profile
|--------------------------------------------------------------------------
*/

router.get(
  "/profile",
  controller.getProfile,
);

router.patch(
  "/profile",
  profileValidators,
  controller.updateProfile,
);

router.post(
  "/profile/avatar",
  upload.single("image"),
  controller.uploadAvatar,
);

/*
|--------------------------------------------------------------------------
| Account Settings
|--------------------------------------------------------------------------
*/

router.get(
  "/account",
  controller.getAccount,
);

router.patch(
  "/account/email",
  accountEmailValidators,
  controller.changeEmail,
);

router.post(
  "/account/change-password",
  changePasswordValidators,
  controller.changePassword,
);

router.post(
  "/account/logout",
  controller.logout,
);

/*
|--------------------------------------------------------------------------
| Notification Preferences
|--------------------------------------------------------------------------
*/

router.get(
  "/notifications",
  controller.getNotifications,
);

router.patch(
  "/notifications",
  notificationValidators,
  controller.updateNotifications,
);

/*
|--------------------------------------------------------------------------
| Farm Settings
|--------------------------------------------------------------------------
*/

router.get(
  "/farm",
  controller.getFarm,
);

router.patch(
  "/farm",
  farmValidators,
  controller.updateFarm,
);

router.post(
  "/farm/logo",
  upload.single("image"),
  controller.uploadFarmLogo,
);

router.delete(
  "/farm/logo",
  controller.removeFarmLogo,
);

/*
|--------------------------------------------------------------------------
| Feeding Schedule
|--------------------------------------------------------------------------
*/

router.get(
  "/feeding-schedule",
  controller.getFeedingSchedule,
);

router.patch(
  "/feeding-schedule",
  feedingValidators,
  controller.updateFeedingSchedule,
);

module.exports = router;