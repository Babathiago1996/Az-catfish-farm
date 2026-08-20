const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: [true, "Inventory item is required."],
      index: true,
    },

    transactionType: {
      type: String,
      required: [true, "Transaction type is required."],
      enum: [
        "stock_in",
        "stock_out",
        "adjustment",
        "return",
        "damaged",
        "expired",
      ],
      lowercase: true,
      trim: true,
      index: true,
    },

    quantity: {
      type: Number,
      required: [true, "Transaction quantity is required."],
      min: [0, "Transaction quantity cannot be negative."],
    },

    previousQuantity: {
      type: Number,
      required: [true, "Previous quantity is required."],
      min: 0,
    },

    newQuantity: {
      type: Number,
      required: [true, "New quantity is required."],
      min: 0,
    },

    unitCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    referenceType: {
      type: String,
      enum: ["feeding", "expense", "manual", "purchase", "adjustment", "other"],
      default: "manual",
      lowercase: true,
      trim: true,
      index: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

inventoryTransactionSchema.index({
  inventoryItem: 1,
  transactionDate: -1,
});

inventoryTransactionSchema.index({
  transactionType: 1,
  transactionDate: -1,
});

inventoryTransactionSchema.index({
  referenceType: 1,
  transactionDate: -1,
});

inventoryTransactionSchema.index({
  transactionDate: -1,
});

module.exports = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema,
);
