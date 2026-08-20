const WaterManagement = require("../models/WaterManagement");
const Pond = require("../models/Pond");
const Notification = require("../models/Notification");

const dateStart = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const dateEnd = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getWaterStatus = (date) => {
  if (!date) {
    return null;
  }

  const today = dateStart(new Date());
  const target = dateStart(date);

  if (target < today) {
    return "overdue";
  }

  if (target.getTime() === today.getTime()) {
    return "due";
  }

  return "upcoming";
};

const createNotificationIfMissing = async ({
  type,
  title,
  message,
  referenceId,
  metadata = {}
}) => {
  const existing =
    await Notification.findOne({
      type,
      referenceId,
      createdAt: {
        $gte: dateStart(new Date())
      }
    });

  if (existing) {
    return existing;
  }

  return Notification.create({
    type,
    title,
    message,
    referenceId,
    metadata,
    isRead: false
  });
};

const generateWaterChangeNotifications =
  async () => {
    const today = dateStart(new Date());
    const tomorrow = dateEnd(
      new Date(
        today.getTime() +
          24 * 60 * 60 * 1000
      )
    );

    const records =
      await WaterManagement.find({
        nextWaterChange: {
          $ne: null,
          $lte: tomorrow
        }
      })
        .populate(
          "pond",
          "pondName pondNumber"
        )
        .lean();

    const notifications = [];

    for (const record of records) {
      const status = getWaterStatus(
        record.nextWaterChange
      );

      if (
        status !== "due" &&
        status !== "overdue"
      ) {
        continue;
      }

      const pondName =
        record.pond?.pondName ||
        `Pond ${record.pond?.pondNumber || ""}`;

      const title =
        status === "overdue"
          ? "Water Change Overdue"
          : "Water Change Due";

      const message =
        status === "overdue"
          ? `Water change for ${pondName} is overdue.`
          : `Water change for ${pondName} is due today.`;

      const notification =
        await createNotificationIfMissing({
          type:
            status === "overdue"
              ? "water_change_overdue"
              : "water_change_due",
          title,
          message,
          referenceId: record._id,
          metadata: {
            pondId: record.pond?._id || null,
            nextWaterChange:
              record.nextWaterChange,
            status
          }
        });

      notifications.push(notification);
    }

    return notifications;
  };

const generateEquipmentNotifications =
  async () => {
    const records =
      await WaterManagement.find({
        $or: [
          {
            pumpStatus: {
              $in: [
                "needs_attention",
                "maintenance"
              ]
            }
          },
          {
            electricityStatus: {
              $in: [
                "unavailable",
                "unstable"
              ]
            }
          }
        ]
      })
        .populate(
          "pond",
          "pondName pondNumber"
        )
        .lean();

    const notifications = [];

    for (const record of records) {
      const pondName =
        record.pond?.pondName ||
        `Pond ${record.pond?.pondNumber || ""}`;

      if (
        record.pumpStatus ===
          "needs_attention" ||
        record.pumpStatus === "maintenance"
      ) {
        const notification =
          await createNotificationIfMissing({
            type: "pump_maintenance",
            title: "Pump Needs Attention",
            message:
              `The pump associated with ${pondName} needs attention.`,
            referenceId: record._id,
            metadata: {
              pondId:
                record.pond?._id || null,
              pumpStatus:
                record.pumpStatus
            }
          });

        notifications.push(notification);
      }

      if (
        record.electricityStatus ===
          "unavailable" ||
        record.electricityStatus === "unstable"
      ) {
        const notification =
          await createNotificationIfMissing({
            type: "electricity_attention",
            title: "Electricity Needs Attention",
            message:
              `Electricity status for ${pondName} requires attention.`,
            referenceId: record._id,
            metadata: {
              pondId:
                record.pond?._id || null,
              electricityStatus:
                record.electricityStatus
            }
          });

        notifications.push(notification);
      }
    }

    return notifications;
  };

const generateMaintenanceNotifications =
  async () => {
    const [
      waterNotifications,
      equipmentNotifications
    ] = await Promise.all([
      generateWaterChangeNotifications(),
      generateEquipmentNotifications()
    ]);

    return [
      ...waterNotifications,
      ...equipmentNotifications
    ];
  };

const getMaintenanceDashboardData =
  async () => {
    const today = dateStart(new Date());
    const tomorrow = dateEnd(
      new Date(
        today.getTime() +
          24 * 60 * 60 * 1000
      )
    );

    const [
      waterDueToday,
      waterOverdue,
      pumpAttention,
      electricityAttention
    ] = await Promise.all([
      WaterManagement.countDocuments({
        nextWaterChange: {
          $gte: today,
          $lte: dateEnd(today)
        }
      }),

      WaterManagement.countDocuments({
        nextWaterChange: {
          $lt: today
        }
      }),

      WaterManagement.countDocuments({
        pumpStatus: {
          $in: [
            "needs_attention",
            "maintenance"
          ]
        }
      }),

      WaterManagement.countDocuments({
        electricityStatus: {
          $in: [
            "unavailable",
            "unstable"
          ]
        }
      })
    ]);

    const upcomingWaterChanges =
      await WaterManagement.find({
        nextWaterChange: {
          $gte: today,
          $lte: tomorrow
        }
      })
        .populate(
          "pond",
          "pondName pondNumber"
        )
        .sort({
          nextWaterChange: 1
        })
        .lean();

    return {
      waterDueToday,
      waterOverdue,
      pumpAttention,
      electricityAttention,
      upcomingWaterChanges,
      generatedAt: new Date()
    };
  };

module.exports = {
  generateMaintenanceNotifications,
  generateWaterChangeNotifications,
  generateEquipmentNotifications,
  getMaintenanceDashboardData
};