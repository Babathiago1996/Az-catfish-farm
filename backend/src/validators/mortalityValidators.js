const { body, param, query } = require("express-validator");

/*
 * Keep this list synchronized with the
 * estimatedCause enum in the Mortality model.
 */
const MORTALITY_CAUSES = [
  "disease",
  "poor_water_quality",
  "overfeeding",
  "underfeeding",
  "handling",
  "predator",
  "stress",
  "unknown",
  "other",
];

/**
 * Create mortality record validators
 */
const createMortalityValidators = [
  body("date")
    .isISO8601()
    .withMessage("Mortality date must be a valid date.")
    .toDate(),

  body("pond").isMongoId().withMessage("A valid pond is required."),

  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Mortality quantity must be at least 1.")
    .toInt(),

  body("estimatedCause")
    .optional({ nullable: true })
    .isIn(MORTALITY_CAUSES)
    .withMessage(
      `Estimated cause must be one of: ${MORTALITY_CAUSES.join(", ")}.`,
    ),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage("Notes cannot exceed 3,000 characters."),

  /*
   * These fields correspond to the nested
   * Mortality.image object in the model.
   *
   * The controller/service converts them into:
   *
   * image: {
   *   url: imageUrl,
   *   publicId: imagePublicId
   * }
   */
  body("imageUrl")
    .optional({ nullable: true })
    .isURL({
      protocols: ["http", "https"],
      require_protocol: true,
    })
    .withMessage("Image URL must be a valid HTTP or HTTPS URL."),

  body("imagePublicId")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Image public ID cannot exceed 500 characters."),
];

/**
 * Update mortality record validators
 */
const updateMortalityValidators = [
  param("id").isMongoId().withMessage("Mortality record ID must be valid."),

  body("date")
    .optional()
    .isISO8601()
    .withMessage("Mortality date must be a valid date.")
    .toDate(),

  body("pond").optional().isMongoId().withMessage("Pond must be a valid ID."),

  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Mortality quantity must be at least 1.")
    .toInt(),

  body("estimatedCause")
    .optional({ nullable: true })
    .isIn(MORTALITY_CAUSES)
    .withMessage(
      `Estimated cause must be one of: ${MORTALITY_CAUSES.join(", ")}.`,
    ),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 3000 })
    .withMessage("Notes cannot exceed 3,000 characters."),

  body("imageUrl")
    .optional({ nullable: true })
    .isURL({
      protocols: ["http", "https"],
      require_protocol: true,
    })
    .withMessage("Image URL must be a valid HTTP or HTTPS URL."),

  body("imagePublicId")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Image public ID cannot exceed 500 characters."),
];

/**
 * Get one mortality record
 */
const mortalityIdValidators = [
  param("id").isMongoId().withMessage("Mortality record ID must be valid."),
];

/**
 * List mortality records
 */
const listMortalityValidators = [
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

/**
 * Mortality summary
 */
const mortalitySummaryValidators = [
  query("pond").optional().isMongoId().withMessage("Pond must be a valid ID."),

  query("from").optional().isISO8601().withMessage("From date must be valid."),

  query("to").optional().isISO8601().withMessage("To date must be valid."),
];

module.exports = {
  MORTALITY_CAUSES,
  createMortalityValidators,
  updateMortalityValidators,
  mortalityIdValidators,
  listMortalityValidators,
  mortalitySummaryValidators,
};
