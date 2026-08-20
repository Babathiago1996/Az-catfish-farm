const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const controller =
  require("../controllers/notificationController");

const {
  createNotificationValidators,
  notificationIdValidators,
  listNotificationValidators,
} = require("../validators/notificationValidators");

const router =
  express.Router();

router.use(protect);

router.get(
  "/unread-count",
  controller.getUnreadCount,
);

router.patch(
  "/read-all",
  controller.markAllNotificationsAsRead,
);

router.get(
  "/",
  listNotificationValidators,
  controller.listNotifications,
);

router.post(
  "/",
  createNotificationValidators,
  controller.createNotification,
);

router.get(
  "/:id",
  notificationIdValidators,
  controller.getNotification,
);

router.patch(
  "/:id/read",
  notificationIdValidators,
  controller.markNotificationAsRead,
);

router.patch(
  "/:id/unread",
  notificationIdValidators,
  controller.markNotificationAsUnread,
);

router.delete(
  "/:id",
  notificationIdValidators,
  controller.deleteNotification,
);

module.exports = router;