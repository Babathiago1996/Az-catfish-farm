const {
  body,
  param,
  query,
} = require("express-validator");

/*
 * ---------------------------------------------------------
 * ALLOWED VALUES
 * ---------------------------------------------------------
 */

const waterConditions = [
  "normal",
  "cloudy",
  "dirty",
  "algae",
];

const waterLevels = [
  "normal",
  "low",
  "high",
];

const pumpStatuses = [
  "working",
  "maintenance",
  "faulty",
  "not_applicable",
];

const electricityStatuses = [
  "available",
  "unavailable",
  "generator",
  "solar",
];

/*
 * ---------------------------------------------------------
 * CREATE
 * ---------------------------------------------------------
 */

const createWaterManagementValidators = [
  body("pond")
    .isMongoId()
    .withMessage("A valid pond is required."),

  body("lastWaterChange")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Last water change date must be valid.")
    .toDate(),

  body("nextWaterChange")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Next water change date must be valid.")
    .toDate(),

  body("waterCondition")
    .optional()
    .isIn(waterConditions)
    .withMessage("Invalid water condition."),

  body("waterLevel")
    .optional()
    .isIn(waterLevels)
    .withMessage("Invalid water level."),

  body("pumpStatus")
    .optional()
    .isIn(pumpStatuses)
    .withMessage("Invalid pump status."),

  body("electricityStatus")
    .optional()
    .isIn(electricityStatuses)
    .withMessage("Invalid electricity status."),

  body("waterChangeNotes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage(
      "Water-change notes cannot exceed 3,000 characters.",
    ),
];

/*
 * ---------------------------------------------------------
 * UPDATE
 * ---------------------------------------------------------
 */

const updateWaterManagementValidators = [
  param("id")
    .isMongoId()
    .withMessage(
      "Water-management ID must be valid.",
    ),

  body("pond")
    .optional()
    .isMongoId()
    .withMessage("Pond must be a valid ID."),

  body("lastWaterChange")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Last water change date must be valid.")
    .toDate(),

  body("nextWaterChange")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Next water change date must be valid.")
    .toDate(),

  body("waterCondition")
    .optional()
    .isIn(waterConditions)
    .withMessage("Invalid water condition."),

  body("waterLevel")
    .optional()
    .isIn(waterLevels)
    .withMessage("Invalid water level."),

  body("pumpStatus")
    .optional()
    .isIn(pumpStatuses)
    .withMessage("Invalid pump status."),

  body("electricityStatus")
    .optional()
    .isIn(electricityStatuses)
    .withMessage("Invalid electricity status."),

  body("waterChangeNotes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage(
      "Water-change notes cannot exceed 3,000 characters.",
    ),
];

/*
 * ---------------------------------------------------------
 * ID
 * ---------------------------------------------------------
 */

const waterManagementIdValidators = [
  param("id")
    .isMongoId()
    .withMessage(
      "Water-management ID must be valid.",
    ),
];

/*
 * ---------------------------------------------------------
 * LIST
 * ---------------------------------------------------------
 */

const listWaterManagementValidators = [
  query("pond")
    .optional()
    .isMongoId()
    .withMessage("Pond must be a valid ID."),

  query("status")
    .optional()
    .isIn([
      "upcoming",
      "due",
      "overdue",
    ])
    .withMessage(
      "Invalid water-change status.",
    ),

  query("from")
    .optional()
    .isISO8601()
    .withMessage("From date must be valid."),

  query("to")
    .optional()
    .isISO8601()
    .withMessage("To date must be valid."),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be at least 1.")
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: 1,
      max: 100,
    })
    .withMessage(
      "Limit must be between 1 and 100.",
    )
    .toInt(),
];

/*
 * ---------------------------------------------------------
 * RECORD WATER CHANGE
 * ---------------------------------------------------------
 *
 * lastWaterChange is deliberately NOT accepted from the
 * frontend because the backend sets it automatically to now.
 */

const recordWaterChangeValidators = [
  param("id")
    .isMongoId()
    .withMessage(
      "Water-management ID must be valid.",
    ),

  body("nextWaterChange")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Next water change date must be valid.")
    .toDate(),

  body("waterCondition")
    .optional()
    .isIn(waterConditions)
    .withMessage("Invalid water condition."),

  body("waterLevel")
    .optional()
    .isIn(waterLevels)
    .withMessage("Invalid water level."),

  body("pumpStatus")
    .optional()
    .isIn(pumpStatuses)
    .withMessage("Invalid pump status."),

  body("electricityStatus")
    .optional()
    .isIn(electricityStatuses)
    .withMessage("Invalid electricity status."),

  body("waterChangeNotes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage(
      "Water-change notes cannot exceed 3,000 characters.",
    ),
];

module.exports = {
  createWaterManagementValidators,
  updateWaterManagementValidators,
  waterManagementIdValidators,
  listWaterManagementValidators,
  recordWaterChangeValidators,
};