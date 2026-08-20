const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Contact name is required."],
      trim: true,
      maxlength: 150
    },

    email: {
      type: String,
      required: [true, "Contact email is required."],
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address."
      ]
    },

    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 50
    },

    subject: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250
    },

    message: {
      type: String,
      required: [true, "Contact message is required."],
      trim: true,
      maxlength: 5000
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true
    },

    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

contactMessageSchema.index({
  createdAt: -1,
  isRead: 1
});

module.exports = mongoose.model(
  "ContactMessage",
  contactMessageSchema
);