const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Administrator email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid administrator email.",
      ],
    },
    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 50,
    },

    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    avatar: {
      url: {
        type: String,
        default: "",
        trim: true,
      },

      publicId: {
        type: String,
        default: "",
        trim: true,
      },
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    sessionVersion: {
      type: Number,
      default: 0,
      min: 0,
    },

    password: {
      type: String,
      required: [true, "Administrator password is required."],
      minlength: [8, "Password must contain at least 8 characters."],
      select: false,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    resetPasswordTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

adminSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),

    name: this.name || "",

    email: this.email,

    phone: this.phone || "",

    bio: this.bio || "",

    avatar: {
      url: this.avatar?.url || "",

      publicId: this.avatar?.publicId || "",
    },

    lastLoginAt: this.lastLoginAt,

    passwordChangedAt: this.passwordChangedAt,

    isActive: this.isActive,

    createdAt: this.createdAt,

    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("Admin", adminSchema);
