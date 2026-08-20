const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: [
        "farm",
        "financial",
        "production",
        "sales",
        "expense",
        "growth",
        "mortality",
        "inventory",
      ],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    period: {
      from: {
        type: Date,
        default: null,
      },

      to: {
        type: Date,
        default: null,
      },
    },

    pond: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pond",
      default: null,
      index: true,
    },

    timeZone: {
      type: String,
      required: true,
      default: "Africa/Lagos",
      trim: true,
    },

    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

reportSchema.index({
  reportType: 1,
  generatedAt: -1,
});

reportSchema.index({
  pond: 1,
  generatedAt: -1,
});

reportSchema.index({
  "period.from": 1,
  "period.to": 1,
});

reportSchema.pre("save", function (next) {
  if (
    this.title !== undefined &&
    this.title !== null
  ) {
    this.title = String(this.title).trim();
  }

  if (
    this.timeZone !== undefined &&
    this.timeZone !== null
  ) {
    this.timeZone = String(this.timeZone).trim();
  }

  if (
    this.notes !== undefined &&
    this.notes !== null
  ) {
    this.notes = String(this.notes).trim();
  }

  next();
});

module.exports = mongoose.model(
  "Report",
  reportSchema,
);