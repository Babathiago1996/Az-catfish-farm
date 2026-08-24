const {
  body,
  param,
  query,
} = require("express-validator");

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
 * CREATE
 */
const createMortalityValidators = [
  body("date")
    .isISO8601()
    .withMessage(
      "Mortality date must be a valid date.",
    )
    .toDate(),

  body("pond")
    .isMongoId()
    .withMessage(
      "A valid pond is required.",
    ),

  body("quantity")
    .isInt({ min: 1 })
    .withMessage(
      "Mortality quantity must be at least 1.",
    )
    .toInt(),

  body("estimatedCause")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isIn(MORTALITY_CAUSES)
    .withMessage(
      `Estimated cause must be one of: ${MORTALITY_CAUSES.join(", ")}.`,
    ),

  body("notes")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .trim()
    .isLength({
      max: 3000,
    })
    .withMessage(
      "Notes cannot exceed 3,000 characters.",
    ),
];

/**
 * UPDATE
 */
const updateMortalityValidators = [
  param("id")
    .isMongoId()
    .withMessage(
      "Mortality record ID must be valid.",
    ),

  body("date")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isISO8601()
    .withMessage(
      "Mortality date must be a valid date.",
    )
    .toDate(),

  body("pond")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isMongoId()
    .withMessage(
      "Pond must be a valid ID.",
    ),

  body("quantity")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isInt({ min: 1 })
    .withMessage(
      "Mortality quantity must be at least 1.",
    )
    .toInt(),

  body("estimatedCause")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isIn(MORTALITY_CAUSES)
    .withMessage(
      `Estimated cause must be one of: ${MORTALITY_CAUSES.join(", ")}.`,
    ),

  body("notes")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .trim()
    .isLength({
      max: 3000,
    })
    .withMessage(
      "Notes cannot exceed 3,000 characters.",
    ),
];

/**
 * GET ONE
 */
const mortalityIdValidators = [
  param("id")
    .isMongoId()
    .withMessage(
      "Mortality record ID must be valid.",
    ),
];

/**
 * LIST
 */
const listMortalityValidators = [
  query("pond")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isMongoId()
    .withMessage(
      "Pond must be a valid ID.",
    ),

  query("from")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isISO8601()
    .withMessage(
      "From date must be valid.",
    ),

  query("to")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isISO8601()
    .withMessage(
      "To date must be valid.",
    ),

  query("page")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isInt({ min: 1 })
    .withMessage(
      "Page must be at least 1.",
    )
    .toInt(),

  query("limit")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isInt({
      min: 1,
      max: 100,
    })
    .withMessage(
      "Limit must be between 1 and 100.",
    )
    .toInt(),
];

/**
 * SUMMARY
 */
const mortalitySummaryValidators = [
  query("pond")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isMongoId()
    .withMessage(
      "Pond must be a valid ID.",
    ),

  query("from")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isISO8601()
    .withMessage(
      "From date must be valid.",
    ),

  query("to")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isISO8601()
    .withMessage(
      "To date must be valid.",
    ),
];

module.exports = {
  MORTALITY_CAUSES,
  createMortalityValidators,
  updateMortalityValidators,
  mortalityIdValidators,
  listMortalityValidators,
  mortalitySummaryValidators,
};