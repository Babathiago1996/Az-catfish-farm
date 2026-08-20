const {
  validationResult,
} = require("express-validator");

const asyncHandler =
  require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

const notificationService =
  require("../services/notificationService");

const getMetadata = (req) => ({
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
      errors:
        errors.array().map(
          (error) => ({
            field:
              error.path,
            message:
              error.msg,
          }),
        ),
    });

    return false;
  }

  return true;
};

const createNotification =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await notificationService.createNotification(
          {
            data:
              req.body,
            ...getMetadata(req),
          },
        );

      if (!result.success) {
        if (
          result.reason ===
          "INVALID_RELATED_ENTITY_ID"
        ) {
          return errorResponse(
            res,
            {
              statusCode: 422,
              message:
                "Related entity ID must be valid.",
            },
          );
        }

        return errorResponse(
          res,
          {
            statusCode: 400,
            message:
              "Unable to create notification.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 201,
          message:
            result.duplicate
              ? "Existing notification returned."
              : "Notification created successfully.",
          data: {
            notification:
              result.notification,
            duplicate:
              result.duplicate,
          },
        },
      );
    },
  );

const listNotifications =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await notificationService.listNotifications(
          {
            type:
              req.query.type,

            priority:
              req.query.priority,

            isRead:
              req.query.isRead,

            source:
              req.query.source,

            search:
              req.query.search,

            page:
              req.query.page,

            limit:
              req.query.limit,
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "Notifications retrieved successfully.",
          data: result,
        },
      );
    },
  );

const getNotification =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const notification =
        await notificationService.getNotificationById(
          req.params.id,
        );

      if (!notification) {
        return errorResponse(
          res,
          {
            statusCode: 404,
            message:
              "Notification not found.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "Notification retrieved successfully.",
          data: {
            notification,
          },
        },
      );
    },
  );

const getUnreadCount =
  asyncHandler(
    async (req, res) => {
      const unreadCount =
        await notificationService.getUnreadCount();

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "Unread notification count retrieved successfully.",
          data: {
            unreadCount,
          },
        },
      );
    },
  );

const markNotificationAsRead =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await notificationService.markNotificationAsRead(
          {
            id:
              req.params.id,
            ...getMetadata(req),
          },
        );

      if (!result.success) {
        return errorResponse(
          res,
          {
            statusCode: 404,
            message:
              "Notification not found.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "Notification marked as read.",
          data: {
            notification:
              result.notification,
          },
        },
      );
    },
  );

const markNotificationAsUnread =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await notificationService.markNotificationAsUnread(
          {
            id:
              req.params.id,
            ...getMetadata(req),
          },
        );

      if (!result.success) {
        return errorResponse(
          res,
          {
            statusCode: 404,
            message:
              "Notification not found.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "Notification marked as unread.",
          data: {
            notification:
              result.notification,
          },
        },
      );
    },
  );

const markAllNotificationsAsRead =
  asyncHandler(
    async (req, res) => {
      const result =
        await notificationService.markAllNotificationsAsRead(
          getMetadata(req),
        );

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "All notifications marked as read.",
          data: result,
        },
      );
    },
  );

const deleteNotification =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await notificationService.deleteNotification(
          {
            id:
              req.params.id,
            ...getMetadata(req),
          },
        );

      if (!result.success) {
        return errorResponse(
          res,
          {
            statusCode: 404,
            message:
              "Notification not found.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,
          message:
            "Notification deleted successfully.",
        },
      );
    },
  );

module.exports = {
  createNotification,
  listNotifications,
  getNotification,
  getUnreadCount,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  deleteNotification,
};