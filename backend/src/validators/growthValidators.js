const { body, param, query } = require("express-validator");

const createGrowthValidators = [
  body("pond").isMongoId().withMessage("A valid pond is required."),

  body("date")
    .isISO8601()
    .withMessage("Growth record date must be valid.")
    .toDate(),

  body("averageWeight")
    .isFloat({ gt: 0 })
    .withMessage("Average weight must be greater than zero.")
    .toFloat(),

  body("sampleSize")
    .isInt({ min: 1 })
    .withMessage("Sample size must be at least 1.")
    .toInt(),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Notes cannot exceed 2,000 characters."),
];

const updateGrowthValidators = [
  param("id").isMongoId().withMessage("Growth record ID must be valid."),

  body("pond").optional().isMongoId().withMessage("Pond must be a valid ID."),

  body("date")
    .optional()
    .isISO8601()
    .withMessage("Growth record date must be valid.")
    .toDate(),

  body("averageWeight")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Average weight must be greater than zero.")
    .toFloat(),

  body("sampleSize")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Sample size must be at least 1.")
    .toInt(),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Notes cannot exceed 2,000 characters."),
];

const growthIdValidators = [
  param("id").isMongoId().withMessage("Growth record ID must be valid."),
];

const listGrowthValidators = [
  query("pond").optional().isMongoId().withMessage("Pond must be a valid ID."),

  query("from").optional().isISO8601().withMessage("From date must be valid."),

  query("to").optional().isISO8601().withMessage("To date must be valid."),

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
    .withMessage("Limit must be between 1 and 100.")
    .toInt(),
];

const growthAnalyticsValidators = [
  query("pond").optional().isMongoId().withMessage("Pond must be a valid ID."),

  query("from").optional().isISO8601().withMessage("From date must be valid."),

  query("to").optional().isISO8601().withMessage("To date must be valid."),

  query("limit")
    .optional()
    .isInt({
      min: 1,
      max: 200,
    })
    .withMessage("Limit must be between 1 and 200.")
    .toInt(),
];

module.exports = {
  createGrowthValidators,
  updateGrowthValidators,
  growthIdValidators,
  listGrowthValidators,
  growthAnalyticsValidators,
};
