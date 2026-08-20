const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    category: {
      type: String,
      required: true,
      enum: [
        "farm",
        "pond",
        "fish",
        "growth",
        "feeding",
        "water_quality",
        "mortality",
        "equipment",
        "activity",
        "other",
      ],
      lowercase: true,
      trim: true,
      index: true,
    },

    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },

    cloudinaryPublicId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    cloudinaryResourceType: {
      type: String,
      default: "image",
      enum: ["image"],
    },

    format: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },

    width: {
      type: Number,
      min: 0,
      default: 0,
    },

    height: {
      type: Number,
      min: 0,
      default: 0,
    },

    bytes: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

gallerySchema.index({
  category: 1,
  createdAt: -1,
});

gallerySchema.index({
  createdAt: -1,
});

gallerySchema.pre("save", function (next) {
  if (this.title !== undefined && this.title !== null) {
    this.title = String(this.title).trim();
  }

  if (
    this.description !== undefined &&
    this.description !== null
  ) {
    this.description = String(this.description).trim();
  }

  if (this.category !== undefined && this.category !== null) {
    this.category = String(this.category).trim().toLowerCase();
  }

  if (
    this.imageUrl !== undefined &&
    this.imageUrl !== null
  ) {
    this.imageUrl = String(this.imageUrl).trim();
  }

  if (
    this.cloudinaryPublicId !== undefined &&
    this.cloudinaryPublicId !== null
  ) {
    this.cloudinaryPublicId =
      String(this.cloudinaryPublicId).trim();
  }

  if (this.format !== undefined && this.format !== null) {
    this.format = String(this.format).trim().toLowerCase();
  }

  next();
});

module.exports = mongoose.model("Gallery", gallerySchema);