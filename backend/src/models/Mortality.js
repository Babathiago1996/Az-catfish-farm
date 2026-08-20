const mongoose = require("mongoose");

const mortalitySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Mortality date is required."],
      index: true
    },

    pond: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pond",
      required: [true, "Pond is required."],
      index: true
    },

    quantity: {
      type: Number,
      required: [true, "Mortality quantity is required."],
      min: [1, "Mortality quantity must be at least 1."]
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
        "other"
      ],
      default: "unknown",
      lowercase: true
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000
    },

    image: {
      url: {
        type: String,
        default: "",
        trim: true
      },

      publicId: {
        type: String,
        default: "",
        trim: true
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

mortalitySchema.index({
  pond: 1,
  date: -1
});

module.exports = mongoose.model("Mortality", mortalitySchema);