// models/FeedingRecord.js

const mongoose = require("mongoose");

const feedingRecordSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Feeding date is required."],
      index: true,
    },

    pond: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pond",
      required: [true, "Pond is required."],
      index: true,
    },

    feedBrand: {
      type: String,
      required: [true, "Feed brand is required."],
      trim: true,
      maxlength: 150,
    },

    feedType: {
      type: String,
      required: [true, "Feed type is required."],
      enum: [
        "starter",
        "juvenile",
        "grower",
        "finisher",
        "floating",
        "sinking",
        "other",
      ],
      lowercase: true,
    },

    feedSize: {
      type: Number,
      required: [true, "Feed size is required."],
      min: 0,
    },

    feedSizeUnit: {
      type: String,
      enum: ["mm", "kg", "other"],
      default: "mm",
      lowercase: true,
    },

    quantityUsed: {
      type: Number,
      required: [true, "Feed quantity is required."],
      min: [0.001, "Feed quantity must be greater than zero."],
    },

    quantityUnit: {
      type: String,
      enum: ["kg", "g", "bag"],
      default: "kg",
      lowercase: true,
    },

    feedingTime: {
      type: String,
      required: [true, "Feeding time is required."],
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Feeding time must use HH:mm format.",
      ],
    },

    cost: {
      type: Number,
      default: 0,
      min: 0,
    },

    estimatedBiomassBeforeFeeding: {
      type: Number,
      default: null,
      min: 0,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    /*
     * Whether this feeding event successfully found a
     * matching inventory item and deducted stock from it.
     *
     * This used to only exist as a transient value returned
     * by the create/update API response, never actually
     * saved on the document — so every time the record was
     * re-fetched (e.g. on page load or after a refresh), it
     * would read back as undefined and always display as
     * "Not linked" in the table, even when the deduction had
     * genuinely happened at creation time.
     */
    inventoryUpdated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

feedingRecordSchema.index({
  date: -1,
  pond: 1,
});

module.exports = mongoose.model("FeedingRecord", feedingRecordSchema);
