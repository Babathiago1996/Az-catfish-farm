const mongoose = require("mongoose");

const waterManagementSchema = new mongoose.Schema(
  {
    /*
     * ---------------------------------------------------------
     * POND
     * ---------------------------------------------------------
     *
     * One water-management record per pond.
     */
    pond: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pond",
      required: [true, "Pond is required."],
      unique: true,
      index: true,
    },

    /*
     * ---------------------------------------------------------
     * WATER CHANGE SCHEDULE
     * ---------------------------------------------------------
     */

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

    /*
     * ---------------------------------------------------------
     * SIMPLE OBSERVATIONAL WATER CONDITION
     * ---------------------------------------------------------
     *
     * No laboratory measurements are required.
     *
     * The owner can record what is visibly observed.
     */
    waterCondition: {
      type: String,
      enum: [
        "normal",
        "cloudy",
        "dirty",
        "algae",
      ],
      default: "normal",
    },

    /*
     * ---------------------------------------------------------
     * WATER LEVEL
     * ---------------------------------------------------------
     */
    waterLevel: {
      type: String,
      enum: [
        "normal",
        "low",
        "high",
      ],
      default: "normal",
    },

    /*
     * ---------------------------------------------------------
     * PUMP
     * ---------------------------------------------------------
     */
    pumpStatus: {
      type: String,
      enum: [
        "working",
        "maintenance",
        "faulty",
        "not_applicable",
      ],
      default: "working",
    },

    /*
     * ---------------------------------------------------------
     * ELECTRICITY / POWER
     * ---------------------------------------------------------
     */
    electricityStatus: {
      type: String,
      enum: [
        "available",
        "unavailable",
        "generator",
        "solar",
      ],
      default: "available",
    },

    /*
     * ---------------------------------------------------------
     * WATER CHANGE / CONDITION NOTE
     * ---------------------------------------------------------
     *
     * One practical note is enough.
     */
    waterChangeNotes: {
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

/*
 * Useful index for schedule-related queries.
 */
waterManagementSchema.index({
  pond: 1,
  nextWaterChange: 1,
});

module.exports = mongoose.model(
  "WaterManagement",
  waterManagementSchema,
);