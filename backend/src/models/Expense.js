const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        "feed",
        "fuel",
        "fingerlings",
        "medicine",
        "repairs",
        "transportation",
        "utilities",
        "other"
      ],
      required: true,
      index: true
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },

    vendor: {
      type: String,
      trim: true,
      maxlength: 150,
      default: ""
    },

    reference: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ""
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ""
    },

    receiptImage: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

expenseSchema.index({
  expenseDate: -1
});

expenseSchema.index({
  category: 1,
  expenseDate: -1
});

expenseSchema.pre(
  "save",
  function (next) {
    if (
      this.amount !== undefined &&
      this.amount !== null
    ) {
      this.amount = Number(
        Number(this.amount).toFixed(2)
      );
    }

    next();
  }
);

module.exports = mongoose.model(
  "Expense",
  expenseSchema
);