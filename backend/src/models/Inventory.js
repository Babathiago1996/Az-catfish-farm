const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Inventory item name is required."],
      trim: true,
      maxlength: 150
    },

    category: {
      type: String,
      required: [true, "Inventory category is required."],
      enum: [
        "feed",
        "salt",
        "medicine",
        "nets",
        "buckets",
        "pipes",
        "fuel",
        "equipment",
        "other"
      ],
      lowercase: true,
      index: true
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500
    },

    quantity: {
      type: Number,
      required: [true, "Inventory quantity is required."],
      min: 0,
      default: 0
    },

    unit: {
      type: String,
      required: [true, "Inventory unit is required."],
      trim: true,
      maxlength: 30
    },

    reorderLevel: {
      type: Number,
      default: 0,
      min: 0
    },

    unitCost: {
      type: Number,
      default: 0,
      min: 0
    },

    supplier: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150
    },

    storageLocation: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150
    },

    lastRestockedAt: {
      type: Date,
      default: null
    },

    isActive: {
      type: Boolean,
      default: true,
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

inventorySchema.index({
  name: "text",
  description: "text",
  supplier: "text"
});

inventorySchema.virtual("isLowStock").get(function isLowStock() {
  return this.quantity <= this.reorderLevel;
});

inventorySchema.set("toJSON", {
  virtuals: true
});

module.exports = mongoose.model("Inventory", inventorySchema);