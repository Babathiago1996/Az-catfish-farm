const mongoose = require("mongoose");

const dailyActivitySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Activity date is required."],
      index: true,
    },

    time: {
      type: String,
      default: "",
      trim: true,
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Activity time must use HH:mm format.",
      ],
    },

    period: {
      type: String,
      enum: [
        "morning",
        "afternoon",
        "evening",
        "other",
      ],
      default: "morning",
      index: true,
    },

    type: {
      type: String,
      required: [true, "Activity type is required."],
      enum: [
        "feeding",
        "water_check",
        "fish_observation",
        "water_change",
        "cleaning",
        "medication",
        "maintenance",
        "harvesting",
        "stocking",
        "sales",
        "other",
      ],
      index: true,
    },

    pond: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pond",
      default: null,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Activity title is required."],
      trim: true,
      maxlength: 150,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    completed: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

dailyActivitySchema.index({
  date: -1,
  period: 1,
});

dailyActivitySchema.index({
  pond: 1,
  date: -1,
});

dailyActivitySchema.index({
  type: 1,
  date: -1,
});

module.exports = mongoose.model(
  "DailyActivity",
  dailyActivitySchema,
);