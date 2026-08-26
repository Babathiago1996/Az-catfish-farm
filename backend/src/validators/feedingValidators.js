const { body, param, query } = require("express-validator");

const feedTypes = [
  "starter",
  "juvenile",
  "grower",
  "finisher",
  "floating",
  "sinking",
  "other",
];

const feedSizeUnits = ["mm", "kg", "other"];

const quantityUnits = ["kg", "g", "bag"];

const createFeedingValidators = [
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Feeding date must be valid.")
    .toDate(),

  body("pond").isMongoId().withMessage("A valid pond is required."),

  body("feedBrand")
    .trim()
    .notEmpty()
    .withMessage("Feed brand is required.")
    .isLength({ max: 150 })
    .withMessage("Feed brand cannot exceed 150 characters."),

  body("feedType").isIn(feedTypes).withMessage("Invalid feed type."),

  body("feedSize")
    .isFloat({ min: 0 })
    .withMessage("Feed size must be zero or greater.")
    .toFloat(),

  body("feedSizeUnit")
    .optional()
    .isIn(feedSizeUnits)
    .withMessage("Feed size unit must be mm, kg, or other."),

  body("quantityUsed")
    .isFloat({ min: 0.001 })
    .withMessage("Quantity used must be greater than zero.")
    .toFloat(),

  body("quantityUnit")
    .optional()
    .isIn(quantityUnits)
    .withMessage("Quantity unit must be kg, g, or bag."),

  body("feedingTime")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Feeding time must use HH:MM format."),

  body("cost")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Feed cost cannot be negative.")
    .toFloat(),

  body("estimatedBiomassBeforeFeeding")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Estimated biomass cannot be negative.")
    .toFloat(),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Feeding notes cannot exceed 2,000 characters."),
];

const updateFeedingValidators = [
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Feeding date must be valid.")
    .toDate(),

  body("pond").isMongoId().withMessage("A valid pond is required."),

  body("feedBrand")
    .trim()
    .notEmpty()
    .withMessage("Feed brand is required.")
    .isLength({ max: 150 })
    .withMessage("Feed brand cannot exceed 150 characters."),

  body("feedType").isIn(feedTypes).withMessage("Invalid feed type."),

  body("feedSize")
    .isFloat({ min: 0 })
    .withMessage("Feed size must be zero or greater.")
    .toFloat(),

  body("feedSizeUnit")
    .optional()
    .isIn(feedSizeUnits)
    .withMessage("Feed size unit must be mm, kg, or other."),

  body("quantityUsed")
    .isFloat({ min: 0.001 })
    .withMessage("Quantity used must be greater than zero.")
    .toFloat(),

  body("quantityUnit")
    .optional()
    .isIn(quantityUnits)
    .withMessage("Quantity unit must be kg, g, or bag."),

  body("feedingTime")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Feeding time must use HH:MM format."),

  body("cost")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Feed cost cannot be negative.")
    .toFloat(),

  body("estimatedBiomassBeforeFeeding")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Estimated biomass cannot be negative.")
    .toFloat(),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Feeding notes cannot exceed 2,000 characters."),
];

const feedingIdValidators = [
  param("id").isMongoId().withMessage("Feeding record ID must be valid."),
];

const listFeedingValidators = [
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
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100.")
    .toInt(),
];

module.exports = {
  createFeedingValidators,
  updateFeedingValidators,
  feedingIdValidators,
  listFeedingValidators,
};