const Notification = require("../models/Notification");
const Admin = require("../models/Admin");
const FarmSettings = require("../models/FarmSettings");

const {
  sendNotificationEmail,
} = require("./emailService");

const getSettings =
  async () => {
    let settings =
      await FarmSettings.findOne({
        singletonKey: "default",
      }).lean();

    if (!settings) {
      settings =
        await FarmSettings.create({
          singletonKey: "default",
          farmName: "AZ Fish Farm",
          timeZone: "Africa/Lagos",
        });

      settings =
        settings.toObject();
    }

    return settings;
  };

const getAdminEmail =
  async () => {
    const admin =
      await Admin.findOne({
        isActive: true,
      })
        .select("email")
        .lean();

    return admin?.email || "";
  };

const createAutomatedNotification =
  async ({
    type = "system",
    priority = "normal",
    title,
    message,
    relatedEntityType = "",
    relatedEntityId = null,
    actionUrl = "",
    metadata = {},
    dedupeKey = "",
    sendEmail = true,
  }) => {
    if (!title || !message) {
      throw new Error(
        "Notification title and message are required.",
      );
    }

    const settings =
      await getSettings();

    const preferences =
      settings.notificationPreferences ||
      {};

    const inAppEnabled =
      preferences.inAppNotifications !==
      false;

    const emailEnabled =
      preferences.emailNotifications !==
      false;

    /*
     * If the user has disabled both channels,
     * do not generate the notification.
     */
    if (
      !inAppEnabled &&
      (!sendEmail || !emailEnabled)
    ) {
      return {
        created: false,
        reason:
          "NOTIFICATIONS_DISABLED",
      };
    }

    /*
     * Prevent duplicate unread automated
     * notifications.
     */
    if (dedupeKey) {
      const existing =
        await Notification.findOne({
          dedupeKey,
          isRead: false,
        });

      if (existing) {
        return {
          created: false,
          duplicate: true,
          notification:
            existing,
        };
      }
    }

    const notification =
      await Notification.create({
        type,
        priority,
        title,
        message,
        relatedEntityType,
        relatedEntityId,
        actionUrl,
        metadata,
        dedupeKey,
        source: "automation",
        emailRequired:
          Boolean(
            sendEmail &&
              emailEnabled,
          ),
        emailSent: false,
      });

    /*
     * Send email after the notification
     * has been safely stored.
     */
    if (
      sendEmail &&
      emailEnabled
    ) {
      try {
        const email =
          await getAdminEmail();

        if (!email) {
          throw new Error(
            "Active administrator email was not found.",
          );
        }

        await sendNotificationEmail({
          to: email,
          title,
          message,
          priority,
          type,
          actionUrl,
        });

        notification.emailSent =
          true;

        notification.emailSentAt =
          new Date();

        notification.emailError =
          "";

        await notification.save();
      } catch (error) {
        notification.emailSent =
          false;

        notification.emailError =
          error.message;

        await notification.save();

        console.error(
          `[Notification] Email delivery failed for "${title}":`,
          error.message,
        );
      }
    }

    return {
      created: true,
      duplicate: false,
      notification,
      emailSent:
        notification.emailSent,
    };
  };

/*
 * Feeding
 */
const notifyFeedingCreated =
  async ({
    feeding,
    pondName = "Pond",
  }) => {
    const quantity =
      Number(
        feeding.quantityUsed || 0,
      );

    const unit =
      feeding.quantityUnit || "kg";

    return createAutomatedNotification({
      type: "feeding",
      priority: "normal",

      title:
        "Feeding Record Added",

      message:
        `${pondName} was fed ${quantity} ${unit} of ${feeding.feedBrand || "feed"} at ${feeding.feedingTime}.`,

      relatedEntityType:
        "FeedingRecord",

      relatedEntityId:
        feeding._id,

      actionUrl:
        "/feeding",

      metadata: {
        pond:
          feeding.pond,

        feedBrand:
          feeding.feedBrand,

        quantityUsed:
          quantity,

        quantityUnit:
          unit,

        feedingTime:
          feeding.feedingTime,

        cost:
          Number(feeding.cost || 0),
      },

      dedupeKey:
        `feeding-created-${feeding._id}`,
    });
  };

/*
 * Expense
 */
const notifyExpenseCreated =
  async ({
    expense,
  }) => {
    const amount =
      Number(
        expense.amount ||
          expense.totalAmount ||
          expense.cost ||
          0,
      );

    return createAutomatedNotification({
      type: "expense",
      priority:
        amount >= 100000
          ? "high"
          : "normal",

      title:
        "New Expense Recorded",

      message:
        `A new farm expense of ₦${amount.toLocaleString(
          "en-NG",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )} has been recorded${
          expense.description
            ? ` for ${expense.description}`
            : ""
        }.`,

      relatedEntityType:
        "Expense",

      relatedEntityId:
        expense._id,

      actionUrl:
        "/expenses",

      metadata: {
        amount,
        category:
          expense.category || "",
        description:
          expense.description || "",
      },

      dedupeKey:
        `expense-created-${expense._id}`,
    });
  };

/*
 * Sales
 */
const notifySaleCreated =
  async ({
    sale,
  }) => {
    const amount =
      Number(
        sale.totalAmount ||
          sale.amount ||
          sale.total ||
          0,
      );

    return createAutomatedNotification({
      type: "sales",
      priority: "normal",

      title:
        "New Sale Recorded",

      message:
        `A new fish sale worth ₦${amount.toLocaleString(
          "en-NG",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )} has been recorded.`,

      relatedEntityType:
        "Sale",

      relatedEntityId:
        sale._id,

      actionUrl:
        "/sales",

      metadata: {
        amount,
      },

      dedupeKey:
        `sale-created-${sale._id}`,
    });
  };

/*
 * Stocking
 */
const notifyStockingCreated =
  async ({
    stocking,
  }) => {
    return createAutomatedNotification({
      type: "stocking",
      priority: "normal",

      title:
        "New Stocking Record Added",

      message:
        "A new fish stocking record has been added to the farm.",

      relatedEntityType:
        "Stocking",

      relatedEntityId:
        stocking._id,

      actionUrl:
        "/stocking",

      metadata: {
        stockingId:
          stocking._id,
      },

      dedupeKey:
        `stocking-created-${stocking._id}`,
    });
  };

/*
 * Mortality
 */
const notifyMortalityCreated =
  async ({
    mortality,
  }) => {
    const quantity =
      Number(
        mortality.quantity ||
          mortality.count ||
          mortality.fishCount ||
          0,
      );

    return createAutomatedNotification({
      type: "mortality",
      priority:
        quantity >= 50
          ? "high"
          : "normal",

      title:
        "Fish Mortality Recorded",

      message:
        `${quantity.toLocaleString(
          "en-NG",
        )} fish mortality${
          quantity === 1 ? "" : "ies"
        } has been recorded. Please review the affected pond.`,

      relatedEntityType:
        "Mortality",

      relatedEntityId:
        mortality._id,

      actionUrl:
        "/mortality",

      metadata: {
        quantity,
      },

      dedupeKey:
        `mortality-created-${mortality._id}`,
    });
  };

/*
 * Water management
 */
const notifyWaterRecordCreated =
  async ({
    water,
  }) => {
    return createAutomatedNotification({
      type: "water_quality",
      priority: "normal",

      title:
        "Water Management Record Added",

      message:
        "A new water management record has been added to the farm.",

      relatedEntityType:
        "WaterManagement",

      relatedEntityId:
        water._id,

      actionUrl:
        "/water-management",

      metadata: {
        waterId:
          water._id,
      },

      dedupeKey:
        `water-created-${water._id}`,
    });
  };

module.exports = {
  createAutomatedNotification,

  notifyFeedingCreated,
  notifyExpenseCreated,
  notifySaleCreated,
  notifyStockingCreated,
  notifyMortalityCreated,
  notifyWaterRecordCreated,
};