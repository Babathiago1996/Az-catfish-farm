const mongoose = require("mongoose");

const Notification = require("../models/Notification");

const ActivityLog = require("../models/ActivityLog");

const { sendNotificationEmail } = require("./emailService");

const NOTIFICATION_TIME_ZONE = "Africa/Lagos";

const formatDateInLagos = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-NG", {
    timeZone: NOTIFICATION_TIME_ZONE,

    year: "numeric",
    month: "2-digit",
    day: "2-digit",

    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",

    hour12: false,
  }).format(date);
};

const serializeNotification = (notification) => {
  if (!notification) {
    return null;
  }

  const item =
    typeof notification.toObject === "function"
      ? notification.toObject()
      : {
          ...notification,
        };

  return {
    ...item,

    createdAtLocal: formatDateInLagos(item.createdAt),

    updatedAtLocal: formatDateInLagos(item.updatedAt),

    readAtLocal: formatDateInLagos(item.readAt),

    emailSentAtLocal: formatDateInLagos(item.emailSentAt),

    timeZone: NOTIFICATION_TIME_ZONE,
  };
};

const buildFilter = ({ type, priority, isRead, source, search }) => {
  const filter = {};

  if (type) {
    filter.type = type;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (typeof isRead === "boolean") {
    filter.isRead = isRead;
  }

  if (source) {
    filter.source = source;
  }

  if (search) {
    const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filter.$or = [
      {
        title: {
          $regex: escapedSearch,
          $options: "i",
        },
      },

      {
        message: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
    ];
  }

  return filter;
};

const createNotification = async ({ data, ipAddress, userAgent }) => {
  if (data.relatedEntityId && !mongoose.isValidObjectId(data.relatedEntityId)) {
    return {
      success: false,
      reason: "INVALID_RELATED_ENTITY_ID",
    };
  }

  if (data.dedupeKey) {
    const existing = await Notification.findOne({
      dedupeKey: data.dedupeKey,

      isRead: false,
    });

    if (existing) {
      return {
        success: true,
        notification: serializeNotification(existing),

        duplicate: true,
      };
    }
  }

  const notification = await Notification.create({
    type: data.type || "system",

    priority: data.priority || "normal",

    title: data.title,

    message: data.message,

    relatedEntityType: data.relatedEntityType || "",

    relatedEntityId: data.relatedEntityId || null,

    actionUrl: data.actionUrl || "",

    metadata: data.metadata || {},

    source: data.source || "manual",

    dedupeKey: data.dedupeKey || "",

    emailRequired: Boolean(data.emailRequired),

    emailSent: false,
  });

  /*
   * Manual notification creation can also
   * optionally send email.
   */
  if (data.emailRequired) {
    try {
      const Admin = require("../models/Admin");

      const admin = await Admin.findOne({
        isActive: true,
      })
        .select("email")
        .lean();

      if (!admin?.email) {
        throw new Error("Administrator email address was not found.");
      }

      await sendNotificationEmail({
        to: admin.email,

        title: notification.title,

        message: notification.message,

        priority: notification.priority,

        type: notification.type,

        actionUrl: notification.actionUrl,
      });

      notification.emailSent = true;

      notification.emailSentAt = new Date();

      notification.emailError = "";

      await notification.save();
    } catch (error) {
      notification.emailSent = false;

      notification.emailError = error.message;

      await notification.save();

      console.error("[Notification] Email failed:", error.message);
    }
  }

  await ActivityLog.create({
    action: "create",
    entityType: "Notification",
    entityId: notification._id,

    description: `Notification "${notification.title}" was created.`,

    metadata: {
      type: notification.type,

      priority: notification.priority,

      title: notification.title,

      source: notification.source,

      emailRequired: notification.emailRequired,

      emailSent: notification.emailSent,
    },

    ipAddress: ipAddress || "",

    userAgent: userAgent || "",
  });

  return {
    success: true,

    notification: serializeNotification(notification),

    duplicate: false,
  };
};

const listNotifications = async ({
  type,
  priority,
  isRead,
  source,
  search,
  page = 1,
  limit = 30,
}) => {
  const currentPage = Math.max(Number(page) || 1, 1);

  const pageSize = Math.min(Math.max(Number(limit) || 30, 1), 100);

  let normalizedIsRead = isRead;

  if (
    normalizedIsRead !== undefined &&
    normalizedIsRead !== null &&
    normalizedIsRead !== ""
  ) {
    normalizedIsRead = String(normalizedIsRead).toLowerCase() === "true";
  } else {
    normalizedIsRead = undefined;
  }

  const filter = buildFilter({
    type,
    priority,
    isRead: normalizedIsRead,
    source,
    search,
  });

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Notification.countDocuments(filter),

    Notification.countDocuments({
      isRead: false,
    }),
  ]);

  return {
    notifications: notifications.map(serializeNotification),

    unreadCount,

    pagination: {
      page: currentPage,

      limit: pageSize,

      total,

      pages: Math.ceil(total / pageSize),
    },
  };
};

const getNotificationById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  const notification = await Notification.findById(id).lean();

  return serializeNotification(notification);
};

const getUnreadCount = async () => {
  return Notification.countDocuments({
    isRead: false,
  });
};

const markNotificationAsRead = async ({ id, ipAddress, userAgent }) => {
  if (!mongoose.isValidObjectId(id)) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const notification = await Notification.findById(id);

  if (!notification) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  if (!notification.isRead) {
    notification.isRead = true;

    notification.readAt = new Date();

    await notification.save();

    await ActivityLog.create({
      action: "update",
      entityType: "Notification",

      entityId: notification._id,

      description: `Notification "${notification.title}" was marked as read.`,

      metadata: {
        isRead: true,

        readAt: notification.readAt,
      },

      ipAddress: ipAddress || "",

      userAgent: userAgent || "",
    });
  }

  return {
    success: true,

    notification: serializeNotification(notification),
  };
};

const markNotificationAsUnread = async ({ id, ipAddress, userAgent }) => {
  if (!mongoose.isValidObjectId(id)) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const notification = await Notification.findById(id);

  if (!notification) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  notification.isRead = false;

  notification.readAt = null;

  await notification.save();

  await ActivityLog.create({
    action: "update",
    entityType: "Notification",

    entityId: notification._id,

    description: `Notification "${notification.title}" was marked as unread.`,

    metadata: {
      isRead: false,
    },

    ipAddress: ipAddress || "",

    userAgent: userAgent || "",
  });

  return {
    success: true,

    notification: serializeNotification(notification),
  };
};

const markAllNotificationsAsRead = async ({ ipAddress, userAgent }) => {
  const now = new Date();

  const result = await Notification.updateMany(
    {
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: now,
      },
    },
  );

  if (result.modifiedCount > 0) {
    await ActivityLog.create({
      action: "update",

      entityType: "Notification",

      entityId: null,

      description: `${result.modifiedCount} notification(s) were marked as read.`,

      metadata: {
        modifiedCount: result.modifiedCount,

        readAt: now,
      },

      ipAddress: ipAddress || "",

      userAgent: userAgent || "",
    });
  }

  return {
    success: true,

    modifiedCount: result.modifiedCount,

    readAt: formatDateInLagos(now),

    timeZone: NOTIFICATION_TIME_ZONE,
  };
};

const deleteNotification = async ({ id, ipAddress, userAgent }) => {
  if (!mongoose.isValidObjectId(id)) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const notification = await Notification.findById(id);

  if (!notification) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  await Notification.deleteOne({
    _id: notification._id,
  });

  await ActivityLog.create({
    action: "delete",

    entityType: "Notification",

    entityId: notification._id,

    description: `Notification "${notification.title}" was deleted.`,

    metadata: {
      type: notification.type,

      priority: notification.priority,

      title: notification.title,
    },

    ipAddress: ipAddress || "",

    userAgent: userAgent || "",
  });

  return {
    success: true,
  };
};

module.exports = {
  createNotification,
  listNotifications,
  getNotificationById,
  getUnreadCount,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  deleteNotification,
  serializeNotification,
  formatDateInLagos,
  NOTIFICATION_TIME_ZONE,
};
