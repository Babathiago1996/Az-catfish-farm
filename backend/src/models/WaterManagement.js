const mongoose = require("mongoose");

const waterManagementSchema = new mongoose.Schema(
  {
    pond: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pond",
      required: [true, "Pond is required."],
      unique: true,
      index: true,
    },

    lastWaterChange: {
      type: Date,
      default: null,
      index: true,
    },

    nextWaterChange: {
      type: Date,
      default: null,
      index: true,
    },

    waterQualityNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },

    waterParameters: {
      temperature: {
        type: Number,
        default: null,
        min: -10,
        max: 100,
      },

      ph: {
        type: Number,
        default: null,
        min: 0,
        max: 14,
      },

      dissolvedOxygen: {
        type: Number,
        default: null,
        min: 0,
      },

      ammonia: {
        type: Number,
        default: null,
        min: 0,
      },

      nitrite: {
        type: Number,
        default: null,
        min: 0,
      },
    },

    pumpStatus: {
      type: String,
      enum: ["working", "maintenance", "faulty", "not_applicable"],
      default: "working",
    },

    electricityStatus: {
      type: String,
      enum: ["available", "unavailable", "generator", "solar"],
      default: "available",
    },

    pumpMaintenanceDate: {
      type: Date,
      default: null,
    },

    nextPumpMaintenanceDate: {
      type: Date,
      default: null,
      index: true,
    },

    generatorMaintenanceDate: {
      type: Date,
      default: null,
    },

    nextGeneratorMaintenanceDate: {
      type: Date,
      default: null,
      index: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

waterManagementSchema.index({
  pond: 1,
  nextWaterChange: 1,
});

module.exports = mongoose.model("WaterManagement", waterManagementSchema);
