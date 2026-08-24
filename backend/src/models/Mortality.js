const mongoose = require("mongoose");

const mortalitySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Mortality date is required."],
      index: true,
    },

    pond: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pond",
      required: [true, "Pond is required."],
      index: true,
    },

    quantity: {
      type: Number,
      required: [true, "Mortality quantity is required."],
      min: [1, "Mortality quantity must be at least 1."],
    },

    estimatedCause: {
      type: String,
      enum: [
        "disease",
        "poor_water_quality",
        "overfeeding",
        "underfeeding",
        "handling",
        "predator",
        "stress",
        "unknown",
        "other",
      ],
      default: "unknown",
      lowercase: true,
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: [3000, "Notes cannot exceed 3,000 characters."],
    },

    /*
     * Legacy single Cloudinary image.
     *
     * Kept only so older records (created before
     * multi-image support) keep working. New records
     * should use `images` below instead.
     */
    image: {
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

    /*
     * Optional Cloudinary images (up to 5).
     *
     * The frontend only deals with the image files.
     * Cloudinary details stay on the backend.
     */
    images: {
      type: [
        {
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

          _id: false,
        },
      ],

      default: [],

      validate: {
        validator: (value) => !Array.isArray(value) || value.length <= 5,
        message: "You can upload a maximum of 5 images.",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

mortalitySchema.index({
  pond: 1,
  date: -1,
});

module.exports = mongoose.model(
  "Mortality",
  mortalitySchema,
);