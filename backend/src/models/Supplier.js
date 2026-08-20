const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      index: true,
    },

    contactPerson: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    phoneNumber: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 150,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

supplierSchema.index({
  name: 1,
  createdAt: -1,
});

supplierSchema.index({
  phoneNumber: 1,
  createdAt: -1,
});

supplierSchema.index({
  status: 1,
  createdAt: -1,
});

supplierSchema.index({
  email: 1,
  createdAt: -1,
});

supplierSchema.pre("save", function (next) {
  if (this.name !== undefined && this.name !== null) {
    this.name = String(this.name).trim();
  }

  if (
    this.contactPerson !== undefined &&
    this.contactPerson !== null
  ) {
    this.contactPerson = String(this.contactPerson).trim();
  }

  if (
    this.phoneNumber !== undefined &&
    this.phoneNumber !== null
  ) {
    this.phoneNumber = String(this.phoneNumber).trim();
  }

  if (this.email !== undefined && this.email !== null) {
    this.email = String(this.email).trim().toLowerCase();
  }

  if (this.address !== undefined && this.address !== null) {
    this.address = String(this.address).trim();
  }

  if (this.notes !== undefined && this.notes !== null) {
    this.notes = String(this.notes).trim();
  }

  next();
});

module.exports = mongoose.model("Supplier", supplierSchema);