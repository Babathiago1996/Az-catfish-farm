const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required."],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    saleDate: {
      type: Date,
      required: [true, "Sale date is required."],
      default: Date.now,
      index: true,
    },

    pond: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pond",
      required: [true, "Pond is required for a fish sale."],
      index: true,
    },

    customerName: {
      type: String,
      required: [true, "Customer name is required."],
      trim: true,
      maxlength: [150, "Customer name cannot exceed 150 characters."],
    },

    phoneNumber: {
      type: String,
      default: "",
      trim: true,
      maxlength: [50, "Phone number cannot exceed 50 characters."],
    },

    quantitySold: {
      type: Number,
      required: [true, "Quantity sold is required."],
      min: [1, "Quantity sold must be at least 1."],
    },

    /*
     * Average weight is stored in grams.
     */
    averageWeight: {
      type: Number,
      required: [true, "Average weight is required."],
      min: [0.001, "Average weight must be greater than zero."],
    },

    /*
     * Price is stored per kilogram.
     */
    pricePerKilogram: {
      type: Number,
      required: [true, "Price per kilogram is required."],
      min: [0.001, "Price per kilogram must be greater than zero."],
    },

    /*
     * Total weight is stored in kilograms.
     */
    totalWeight: {
      type: Number,
      required: [true, "Total weight is required."],
      min: [0, "Total weight cannot be negative."],
    },

    /*
     * Total sale amount in the farm's currency.
     */
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required."],
      min: [0, "Total amount cannot be negative."],
    },

    paymentStatus: {
      type: String,
      enum: {
        values: ["paid", "partial", "pending", "cancelled"],
        message: "Payment status is invalid.",
      },
      default: "pending",
      index: true,
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: [0, "Amount paid cannot be negative."],
    },

    balanceDue: {
      type: Number,
      default: 0,
      min: [0, "Balance due cannot be negative."],
    },

    paymentMethod: {
      type: String,
      enum: {
        values: [
          "cash",
          "bank_transfer",
          "pos",
          "mobile_money",
          "other",
        ],
        message: "Payment method is invalid.",
      },
      default: "cash",
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "Notes cannot exceed 2,000 characters."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

saleSchema.index({
  saleDate: -1,
  paymentStatus: 1,
});

saleSchema.index({
  pond: 1,
  saleDate: -1,
});

saleSchema.index({
  customerName: "text",
  invoiceNumber: "text",
  phoneNumber: "text",
});

module.exports = mongoose.model("Sale", saleSchema);