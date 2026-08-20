const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, "Activity log action is required."],
      enum: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "password_change",
        "password_reset",
        "profile_update",
        "stocking",
        "mortality",
        "sale",
        "feeding",
        "water_change",
        "expense",
        "inventory_adjustment",
        "report_generated",
        "settings_update",
        "image_upload",
        "image_delete",
        "other",
      ],
      index: true,
    },

    entityType: {
      type: String,
      required: [true, "Entity type is required."],
      trim: true,
      maxlength: 100,
      index: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    description: {
      type: String,
      required: [true, "Activity log description is required."],
      trim: true,
      maxlength: 1000,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    ipAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    userAgent: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

activityLogSchema.index({
  createdAt: -1,
  action: 1,
  entityType: 1,
});

module.exports = mongoose.model("ActivityLog", activityLogSchema);
