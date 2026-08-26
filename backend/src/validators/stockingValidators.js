const { body, param, query } = require("express-validator");

const objectIdValidation = (fieldName) =>
  param(fieldName).isMongoId().withMessage(`${fieldName} must be a valid ID.`);

const stockingDateValidation = body("stockingDate")
  .isISO8601()
  .withMessage("Stocking date must be a valid date.")
  .toDate();

const pondValidation = body("pond")
  .isMongoId()
  .withMessage("A valid pond is required.");

const quantityValidation = body("fingerlingQuantity")
  .isInt({ min: 1 })
  .withMessage("Fingerling quantity must be at least 1.")
  .toInt();

const fingerlingSizeValidation = body("fingerlingSize")
  .isFloat({ min: 0 })
  .withMessage("Fingerling size must be zero or greater.")
  .toFloat();

const fingerlingSizeUnitValidation = body("fingerlingSizeUnit")
  .optional()
  .isIn(["cm", "inch", "gram"])
  .withMessage("Fingerling size unit must be cm, inch, or gram.");
const supplierValidation = body("supplier")
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 150 })
  .withMessage("Supplier cannot exceed 150 characters.");

const costValidation = body("cost")
  .isFloat({ min: 0 })
  .withMessage("Stocking cost cannot be negative.")
  .toFloat();

const expectedHarvestDateValidation = body("expectedHarvestDate")
  .optional({ nullable: true })
  .isISO8601()
  .withMessage("Expected harvest date must be a valid date.")
  .toDate();

const initialWeightValidation = body("initialWeight")
  .optional()
  .isFloat({ min: 0 })
  .withMessage("Initial weight cannot be negative.")
  .toFloat();

const notesValidation = body("notes")
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 2000 })
  .withMessage("Stocking notes cannot exceed 2,000 characters.");

const createStockingValidators = [
  stockingDateValidation,
  pondValidation,
  quantityValidation,
  fingerlingSizeValidation,
  fingerlingSizeUnitValidation,
  supplierValidation,
  costValidation,
  expectedHarvestDateValidation,
  initialWeightValidation,
  notesValidation,
];

const updateStockingValidators = [
  stockingDateValidation,
  pondValidation,
  quantityValidation,
  fingerlingSizeValidation,
  fingerlingSizeUnitValidation,
  supplierValidation,
  costValidation,
  expectedHarvestDateValidation,
  initialWeightValidation,
  notesValidation,
];

const stockingIdValidators = [objectIdValidation("id")];

const listStockingValidators = [
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
  createStockingValidators,
  updateStockingValidators,
  stockingIdValidators,
  listStockingValidators,
};