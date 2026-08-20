const mongoose = require("mongoose");

const pondSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Pond name is required."],
      trim: true,
      maxlength: 100
    },

    pondNumber: {
      type: String,
      required: [true, "Pond number is required."],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      maxlength: 50
    },

    pondType: {
      type: String,
      required: [true, "Pond type is required."],
      enum: [
        "concrete",
        "earthen",
        "tarpaulin",
        "plastic",
        "fiberglass",
        "other"
      ],
      lowercase: true
    },

    pondSize: {
      value: {
        type: Number,
        required: [true, "Pond size is required."],
        min: 0
      },

      unit: {
        type: String,
        enum: ["sqm", "m2", "liters", "cubic_meters"],
        default: "sqm"
      }
    },

    stockingDate: {
      type: Date,
      default: null
    },

    currentFishCount: {
      type: Number,
      default: 0,
      min: 0
    },

    currentAverageWeight: {
      type: Number,
      default: 0,
      min: 0
    },

    waterSource: {
      type: String,
      enum: [
        "borehole",
        "well",
        "river",
        "rainwater",
        "municipal",
        "other"
      ],
      default: "borehole",
      lowercase: true
    },

    status: {
      type: String,
      enum: ["active", "empty", "maintenance", "inactive"],
      default: "empty",
      index: true
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

pondSchema.index({
  name: "text",
  pondNumber: "text"
});

module.exports = mongoose.model("Pond", pondSchema);