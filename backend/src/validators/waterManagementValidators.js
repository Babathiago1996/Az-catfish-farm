const {
  body,
  param,
  query
} = require("express-validator");

const pumpStatuses = [
  "working",
  "maintenance",
  "faulty",
  "not_applicable"
];

const electricityStatuses = [
  "available",
  "unavailable",
  "generator",
  "solar"
];

const validateWaterParameters = () => [
  body("waterParameters.temperature")
    .optional({ nullable: true })
    .isFloat({ min: -10, max: 100 })
    .withMessage(
      "Water temperature must be between -10 and 100."
    )
    .toFloat(),

  body("waterParameters.ph")
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 14 })
    .withMessage(
      "pH must be between 0 and 14."
    )
    .toFloat(),

  body("waterParameters.dissolvedOxygen")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage(
      "Dissolved oxygen cannot be negative."
    )
    .toFloat(),

  body("waterParameters.ammonia")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage(
      "Ammonia cannot be negative."
    )
    .toFloat(),

  body("waterParameters.nitrite")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage(
      "Nitrite cannot be negative."
    )
    .toFloat()
];

const createWaterManagementValidators = [
  body("pond")
    .isMongoId()
    .withMessage("A valid pond is required."),

  body("lastWaterChange")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Last water change date must be valid."
    )
    .toDate(),

  body("nextWaterChange")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Next water change date must be valid."
    )
    .toDate(),

  body("waterQualityNotes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage(
      "Water quality notes cannot exceed 3,000 characters."
    ),

  body("pumpStatus")
    .optional()
    .isIn(pumpStatuses)
    .withMessage(
      "Invalid pump status."
    ),

  body("electricityStatus")
    .optional()
    .isIn(electricityStatuses)
    .withMessage(
      "Invalid electricity status."
    ),

  body("pumpMaintenanceDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Pump maintenance date must be valid."
    )
    .toDate(),

  body("nextPumpMaintenanceDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Next pump maintenance date must be valid."
    )
    .toDate(),

  body("generatorMaintenanceDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Generator maintenance date must be valid."
    )
    .toDate(),

  body("nextGeneratorMaintenanceDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Next generator maintenance date must be valid."
    )
    .toDate(),

  ...validateWaterParameters(),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage(
      "Notes cannot exceed 3,000 characters."
    )
];

const updateWaterManagementValidators = [
  param("id")
    .isMongoId()
    .withMessage(
      "Water-management ID must be valid."
    ),

  body("pond")
    .optional()
    .isMongoId()
    .withMessage(
      "Pond must be a valid ID."
    ),

  body("lastWaterChange")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Last water change date must be valid."
    )
    .toDate(),

  body("nextWaterChange")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Next water change date must be valid."
    )
    .toDate(),

  body("waterQualityNotes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage(
      "Water quality notes cannot exceed 3,000 characters."
    ),

  body("pumpStatus")
    .optional()
    .isIn(pumpStatuses)
    .withMessage(
      "Invalid pump status."
    ),

  body("electricityStatus")
    .optional()
    .isIn(electricityStatuses)
    .withMessage(
      "Invalid electricity status."
    ),

  body("pumpMaintenanceDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Pump maintenance date must be valid."
    )
    .toDate(),

  body("nextPumpMaintenanceDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Next pump maintenance date must be valid."
    )
    .toDate(),

  body("generatorMaintenanceDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Generator maintenance date must be valid."
    )
    .toDate(),

  body("nextGeneratorMaintenanceDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Next generator maintenance date must be valid."
    )
    .toDate(),

  ...validateWaterParameters(),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage(
      "Notes cannot exceed 3,000 characters."
    )
];

const waterManagementIdValidators = [
  param("id")
    .isMongoId()
    .withMessage(
      "Water-management ID must be valid."
    )
];

const listWaterManagementValidators = [
  query("pond")
    .optional()
    .isMongoId()
    .withMessage(
      "Pond must be a valid ID."
    ),

  query("status")
    .optional()
    .isIn([
      "upcoming",
      "due",
      "overdue"
    ])
    .withMessage(
      "Invalid water-change status."
    ),

  query("from")
    .optional()
    .isISO8601()
    .withMessage(
      "From date must be valid."
    ),

  query("to")
    .optional()
    .isISO8601()
    .withMessage(
      "To date must be valid."
    ),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage(
      "Page must be at least 1."
    )
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: 1,
      max: 100
    })
    .withMessage(
      "Limit must be between 1 and 100."
    )
    .toInt()
];

const recordWaterChangeValidators = [
  param("id")
    .isMongoId()
    .withMessage(
      "Water-management ID must be valid."
    ),

  body("nextWaterChange")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(
      "Next water change date must be valid."
    )
    .toDate(),

  body("waterQualityNotes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage(
      "Water quality notes cannot exceed 3,000 characters."
    ),

  body("pumpStatus")
    .optional()
    .isIn(pumpStatuses)
    .withMessage(
      "Invalid pump status."
    ),

  body("electricityStatus")
    .optional()
    .isIn(electricityStatuses)
    .withMessage(
      "Invalid electricity status."
    ),

  ...validateWaterParameters(),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage(
      "Notes cannot exceed 3,000 characters."
    )
];

module.exports = {
  createWaterManagementValidators,
  updateWaterManagementValidators,
  waterManagementIdValidators,
  listWaterManagementValidators,
  recordWaterChangeValidators
};