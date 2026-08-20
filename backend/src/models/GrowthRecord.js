const mongoose = require("mongoose");

const growthRecordSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Growth record date is required."],
      index: true
    },

    pond: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pond",
      required: [true, "Pond is required."],
      index: true
    },

    averageWeight: {
      type: Number,
      required: [true, "Average weight is required."],
      min: 0
    },

    sampleSize: {
      type: Number,
      required: [true, "Sample size is required."],
      min: [1, "Sample size must be at least 1."]
    },

    biomass: {
      type: Number,
      required: [true, "Biomass is required."],
      min: 0
    },

    growthRate: {
      type: Number,
      default: null
    },

    previousAverageWeight: {
      type: Number,
      default: null,
      min: 0
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

growthRecordSchema.index({
  pond: 1,
  date: -1
});

growthRecordSchema.index(
  {
    pond: 1,
    date: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "GrowthRecord",
  growthRecordSchema
);