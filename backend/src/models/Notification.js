const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "system",
        "inventory",
        "feeding",
        "water_quality",
        "water_change",
        "mortality",
        "growth",
        "sales",
        "payment",
        "expense",
        "pond",
        "stocking",
        "equipment",
        "customer",
        "supplier",
        "security",
        "general",
      ],
      required: true,
      default: "system",
      index: true,
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    /*
     * Email delivery tracking
     */
    emailRequired: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailSent: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailSentAt: {
      type: Date,
      default: null,
    },

    emailError: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    /*
     * Prevent the same reminder/event from
     * generating endless duplicate notifications.
     */
    dedupeKey: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
      index: true,
    },

    relatedEntityType: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    actionUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    source: {
      type: String,
      enum: ["system", "manual", "automation"],
      default: "system",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

notificationSchema.index({
  isRead: 1,
  createdAt: -1,
});

notificationSchema.index({
  type: 1,
  createdAt: -1,
});

notificationSchema.index({
  priority: 1,
  createdAt: -1,
});

notificationSchema.index({
  emailRequired: 1,
  emailSent: 1,
  createdAt: -1,
});

notificationSchema.index({
  relatedEntityType: 1,
  relatedEntityId: 1,
});

notificationSchema.index({
  dedupeKey: 1,
  createdAt: -1,
});

notificationSchema.pre("save", function (next) {
  if (this.title != null) {
    this.title = String(this.title).trim();
  }

  if (this.message != null) {
    this.message = String(this.message).trim();
  }

  if (this.relatedEntityType != null) {
    this.relatedEntityType = String(this.relatedEntityType).trim();
  }

  if (this.actionUrl != null) {
    this.actionUrl = String(this.actionUrl).trim();
  }

  if (this.dedupeKey != null) {
    this.dedupeKey = String(this.dedupeKey).trim();
  }

  if (this.emailError != null) {
    this.emailError = String(this.emailError).trim();
  }

  next();
});

module.exports = mongoose.model("Notification", notificationSchema);
