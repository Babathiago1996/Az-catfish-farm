const mongoose = require("mongoose");

const stockingSchema = new mongoose.Schema(
  {
    stockingDate: {
      type: Date,
      required: [true, "Stocking date is required."],
      index: true
    },

    pond: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pond",
      required: [true, "Pond is required."],
      index: true
    },

    fingerlingQuantity: {
      type: Number,
      required: [true, "Fingerling quantity is required."],
      min: [1, "Fingerling quantity must be at least 1."]
    },

    fingerlingSize: {
      type: Number,
      required: [true, "Fingerling size is required."],
      min: 0
    },

    fingerlingSizeUnit: {
      type: String,
      enum: ["cm", "inch", "gram"],
      default: "cm"
    },

    supplier: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200
    },

    cost: {
      type: Number,
      default: 0,
      min: 0
    },

    expectedHarvestDate: {
      type: Date,
      default: null,
      index: true
    },

    initialWeight: {
      type: Number,
      default: 0,
      min: 0
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

stockingSchema.index({
  pond: 1,
  stockingDate: -1
});

module.exports = mongoose.model("Stocking", stockingSchema);