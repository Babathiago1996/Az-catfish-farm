const Notification = require("../models/Notification");
const FarmSettings = require("../models/FarmSettings");

const {
  createAutomatedNotification,
} = require("./notificationAutomationService");

const FeedingRecord =
  require("../models/FeedingRecord");

const getStartAndEndOfToday =
  (timeZone = "Africa/Lagos") => {
    const now = new Date();

    const parts =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        },
      ).formatToParts(now);

    const year =
      parts.find(
        (part) =>
          part.type === "year",
      )?.value;

    const month =
      parts.find(
        (part) =>
          part.type === "month",
      )?.value;

    const day =
      parts.find(
        (part) =>
          part.type === "day",
      )?.value;

    const start =
      new Date(
        `${year}-${month}-${day}T00:00:00+01:00`,
      );

    const end =
      new Date(
        `${year}-${month}-${day}T23:59:59.999+01:00`,
      );

    return {
      start,
      end,
    };
  };

const runFeedingReminder =
  async () => {
    const settings =
      await FarmSettings.findOne({
        singletonKey: "default",
      }).lean();

    if (
      settings
        ?.notificationPreferences
        ?.feedingReminders === false
    ) {
      return [];
    }

    const schedule =
      settings?.feedingSchedule || {};

    const {
      start,
      end,
    } = getStartAndEndOfToday(
      settings?.timeZone ||
        "Africa/Lagos",
    );

    const slots = [
      {
        name: "morning",
        config:
          schedule.morning,
      },

      {
        name: "afternoon",
        config:
          schedule.afternoon,
      },

      {
        name: "evening",
        config:
          schedule.evening,
      },
    ];

    const generated = [];

    for (const slot of slots) {
      if (
        !slot.config?.enabled ||
        !slot.config?.time
      ) {
        continue;
      }

      const existing =
        await FeedingRecord.exists({
          date: {
            $gte: start,
            $lte: end,
          },

          feedingTime:
            slot.config.time,
        });

      if (existing) {
        continue;
      }

      const result =
        await createAutomatedNotification({
          type: "feeding",
          priority: "high",

          title:
            `${slot.name[0].toUpperCase()}${slot.name.slice(
              1,
            )} Feeding Reminder`,

          message:
            `No feeding record has been recorded for the scheduled ${slot.name} feeding at ${slot.config.time} today. Please review the feeding schedule and record the feeding when completed.`,

          actionUrl:
            "/feeding",

          metadata: {
            slot:
              slot.name,

            scheduledTime:
              slot.config.time,

            date:
              start,
          },

          dedupeKey:
            `feeding-reminder-${start.toISOString().slice(
              0,
              10,
            )}-${slot.name}`,
        });

      if (result.created) {
        generated.push(
          result.notification,
        );
      }
    }

    return generated;
  };

const runInventoryReminder =
  async () => {
    const settings =
      await FarmSettings.findOne({
        singletonKey: "default",
      }).lean();

    if (
      settings
        ?.notificationPreferences
        ?.inventoryAlerts === false
    ) {
      return [];
    }

    /*
     * Inventory model is intentionally loaded
     * here to keep the scheduler modular.
     */
    const Inventory =
      require("../models/Inventory");

    const lowStockItems =
      await Inventory.find({
        $expr: {
          $lte: [
            "$quantity",
            "$reorderLevel",
          ],
        },
      })
        .limit(100)
        .lean();

    const generated = [];

    for (const item of lowStockItems) {
      const quantity =
        Number(item.quantity || 0);

      const reorderLevel =
        Number(
          item.reorderLevel || 0,
        );

      const result =
        await createAutomatedNotification({
          type: "inventory",
          priority:
            quantity <= 0
              ? "critical"
              : "high",

          title:
            quantity <= 0
              ? "Inventory Item Out of Stock"
              : "Inventory Running Low",

          message:
            `${item.name} currently has ${quantity} ${item.unit || "unit"} remaining. The reorder level is ${reorderLevel}. Please restock this item.`,

          relatedEntityType:
            "Inventory",

          relatedEntityId:
            item._id,

          actionUrl:
            "/inventory",

          metadata: {
            itemName:
              item.name,

            quantity,

            reorderLevel,

            unit:
              item.unit || "",
          },

          dedupeKey:
            `inventory-low-${item._id}`,
        });

      if (result.created) {
        generated.push(
          result.notification,
        );
      }
    }

    return generated;
  };

const runDailyNotificationScheduler =
  async () => {
    const results = {
      feeding: [],
      inventory: [],
    };

    try {
      results.feeding =
        await runFeedingReminder();
    } catch (error) {
      console.error(
        "[Notifications] Feeding reminder failed:",
        error.message,
      );
    }

    try {
      results.inventory =
        await runInventoryReminder();
    } catch (error) {
      console.error(
        "[Notifications] Inventory reminder failed:",
        error.message,
      );
    }

    return results;
  };

module.exports = {
  runDailyNotificationScheduler,
  runFeedingReminder,
  runInventoryReminder,
};