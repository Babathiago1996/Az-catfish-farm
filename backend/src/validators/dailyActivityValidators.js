const { body, param, query } = require("express-validator");

const activityTypes = [
  "feeding",
  "water_check",
  "fish_observation",
  "water_change",
  "cleaning",
  "medication",
  "maintenance",
  "harvesting",
  "stocking",
  "sales",
  "other",
];

const activityPeriods = ["morning", "afternoon", "evening", "other"];

const createDailyActivityValidator = [
  body("date")
    .notEmpty()
    .withMessage("Activity date is required.")
    .isISO8601()
    .withMessage("Activity date must be valid."),

  body("time")
    .optional({ values: "falsy" })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Activity time must use HH:mm format."),

  body("period")
    .optional()
    .isIn(activityPeriods)
    .withMessage("Activity period is invalid."),

  body("type")
    .notEmpty()
    .withMessage("Activity type is required.")
    .isIn(activityTypes)
    .withMessage("Activity type is invalid."),

  body("pond")
    .optional({ values: "null" })
    .isMongoId()
    .withMessage("Pond must be a valid ID."),

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Activity title is required.")
    .isLength({ max: 150 })
    .withMessage("Activity title cannot exceed 150 characters."),

  body("notes")
    .optional()
    .isString()
    .withMessage("Activity notes must be text.")
    .isLength({ max: 5000 })
    .withMessage("Activity notes cannot exceed 5000 characters."),

  body("completed")
    .optional()
    .isBoolean()
    .withMessage("Completed must be true or false."),
];

const updateDailyActivityValidator = [
  param("id").isMongoId().withMessage("Activity ID must be valid."),

  body("date")
    .optional()
    .isISO8601()
    .withMessage("Activity date must be valid."),

  body("time")
    .optional({ values: "falsy" })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Activity time must use HH:mm format."),

  body("period")
    .optional()
    .isIn(activityPeriods)
    .withMessage("Activity period is invalid."),

  body("type")
    .optional()
    .isIn(activityTypes)
    .withMessage("Activity type is invalid."),

  body("pond")
    .optional({ values: "null" })
    .isMongoId()
    .withMessage("Pond must be a valid ID."),

  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Activity title cannot be empty.")
    .isLength({ max: 150 })
    .withMessage("Activity title cannot exceed 150 characters."),

  body("notes")
    .optional()
    .isString()
    .withMessage("Activity notes must be text.")
    .isLength({ max: 5000 })
    .withMessage("Activity notes cannot exceed 5000 characters."),

  body("completed")
    .optional()
    .isBoolean()
    .withMessage("Completed must be true or false."),
];

const dailyActivityIdValidator = [
  param("id").isMongoId().withMessage("Activity ID must be valid."),
];

const dailyActivityQueryValidator = [
  query("from").optional().isISO8601().withMessage("From date must be valid."),

  query("to").optional().isISO8601().withMessage("To date must be valid."),

  query("pond").optional().isMongoId().withMessage("Pond must be a valid ID."),

  query("type")
    .optional()
    .isIn(activityTypes)
    .withMessage("Activity type is invalid."),

  query("period")
    .optional()
    .isIn(activityPeriods)
    .withMessage("Activity period is invalid."),

  query("completed")
    .optional()
    .isBoolean()
    .withMessage("Completed must be true or false."),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100."),
];
const dailyActivitySummaryValidator = [
  query("date")
    .optional()
    .isISO8601()
    .withMessage("Summary date must be valid."),

  query("pond").optional().isMongoId().withMessage("Pond must be a valid ID."),
];

module.exports = {
  activityTypes,
  activityPeriods,
  createDailyActivityValidator,
  updateDailyActivityValidator,
  dailyActivityIdValidator,
  dailyActivityQueryValidator,
  dailyActivitySummaryValidator,
};
