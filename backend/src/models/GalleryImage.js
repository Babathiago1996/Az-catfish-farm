const mongoose = require("mongoose");

const galleryImageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Gallery image title is required."],
      trim: true,
      maxlength: 150
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000
    },

    imageUrl: {
      type: String,
      required: [true, "Image URL is required."],
      trim: true
    },

    publicId: {
      type: String,
      required: [true, "Cloudinary public ID is required."],
      trim: true
    },

    category: {
      type: String,
      enum: [
        "farm",
        "pond",
        "fish",
        "feeding",
        "harvest",
        "team",
        "other"
      ],
      default: "farm",
      lowercase: true,
      index: true
    },

    altText: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },

    isPublished: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

galleryImageSchema.index({
  isPublished: 1,
  sortOrder: 1
});

module.exports = mongoose.model(
  "GalleryImage",
  galleryImageSchema
);