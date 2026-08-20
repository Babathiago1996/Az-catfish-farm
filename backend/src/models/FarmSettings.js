const mongoose = require("mongoose");

const socialLinksSchema = new mongoose.Schema(
  {
    facebook: {
      type: String,
      default: "",
      trim: true,
    },

    instagram: {
      type: String,
      default: "",
      trim: true,
    },

    whatsapp: {
      type: String,
      default: "",
      trim: true,
    },

    tiktok: {
      type: String,
      default: "",
      trim: true,
    },

    youtube: {
      type: String,
      default: "",
      trim: true,
    },

    twitter: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const feedingSlotSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },

    time: {
      type: String,
      default: "08:00",
      trim: true,
      match: [
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "Feeding time must use HH:mm format.",
      ],
    },
  },
  {
    _id: false,
  },
);

const feedingScheduleSchema = new mongoose.Schema(
  {
    morning: {
      type: feedingSlotSchema,

      default: () => ({
        enabled: true,
        time: "08:00",
      }),
    },

    afternoon: {
      type: feedingSlotSchema,

      default: () => ({
        enabled: false,
        time: "14:00",
      }),
    },

    evening: {
      type: feedingSlotSchema,

      default: () => ({
        enabled: true,
        time: "18:00",
      }),
    },
  },
  {
    _id: false,
  },
);

const notificationPreferencesSchema =
  new mongoose.Schema(
    {
      emailNotifications: {
        type: Boolean,
        default: true,
      },

      inAppNotifications: {
        type: Boolean,
        default: true,
      },

      waterChangeReminders: {
        type: Boolean,
        default: true,
      },

      feedingReminders: {
        type: Boolean,
        default: true,
      },

      growthReminders: {
        type: Boolean,
        default: true,
      },

      harvestReminders: {
        type: Boolean,
        default: true,
      },

      inventoryAlerts: {
        type: Boolean,
        default: true,
      },

      monthlyReportNotifications: {
        type: Boolean,
        default: true,
      },
    },
  {
    _id: false,
  },
);

const farmSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
      index: true,
    },

    farmName: {
      type: String,
      required: [true, "Farm name is required."],
      default: "AZ Fish Farm",
      trim: true,
      maxlength: 150,
    },

    farmLogo: {
      url: {
        type: String,
        default: "",
        trim: true,
      },

      publicId: {
        type: String,
        default: "",
        trim: true,
      },
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 50,
    },

    address: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    about: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    socialLinks: {
      type: socialLinksSchema,
      default: () => ({}),
    },

    waterChangeIntervalDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 365,
    },

    currency: {
      type: String,
      default: "NGN",
      trim: true,
      uppercase: true,
      maxlength: 10,
    },

    timeZone: {
      type: String,
      default: "Africa/Lagos",
      trim: true,
      maxlength: 100,
    },

    feedingSchedule: {
      type: feedingScheduleSchema,
      default: () => ({}),
    },

    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports =
  mongoose.model(
    "FarmSettings",
    farmSettingsSchema,
  );