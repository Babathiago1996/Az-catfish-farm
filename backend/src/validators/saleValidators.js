const {
  body,
  param,
  query,
} = require("express-validator");

const PAYMENT_STATUSES = [
  "pending",
  "partial",
  "paid",
  "cancelled",
];

const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "pos",
  "mobile_money",
  "other",
];

const createSaleValidators = [
  body("customerName")
    .trim()
    .notEmpty()
    .withMessage("Customer name is required.")
    .isLength({ max: 150 })
    .withMessage(
      "Customer name cannot exceed 150 characters."
    ),

  body("phoneNumber")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage(
      "Phone number cannot exceed 50 characters."
    ),

  body("pond")
    .notEmpty()
    .withMessage("Pond is required for a fish sale.")
    .isMongoId()
    .withMessage("Pond must be a valid ID."),

  body("quantitySold")
    .isInt({ min: 1 })
    .withMessage(
      "Quantity sold must be at least 1."
    )
    .toInt(),

  body("averageWeight")
    .isFloat({ gt: 0 })
    .withMessage(
      "Average fish weight must be greater than zero."
    )
    .toFloat(),

  body("pricePerKilogram")
    .isFloat({ gt: 0 })
    .withMessage(
      "Price per kilogram must be greater than zero."
    )
    .toFloat(),

  body("paymentStatus")
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage("Payment status is invalid."),

  body("amountPaid")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "Amount paid cannot be negative."
    )
    .toFloat(),

  body("paymentMethod")
  .optional()
  .isIn([
    "cash",
    "bank_transfer",
    "pos",
    "mobile_money",
    "other",
  ])
  .withMessage("Payment method is invalid."),

  body("saleDate")
    .optional()
    .isISO8601()
    .withMessage("Sale date must be valid.")
    .toDate(),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage(
      "Notes cannot exceed 2,000 characters."
    ),
];

const updateSaleValidators = [
  param("id")
    .isMongoId()
    .withMessage("Sale ID must be valid."),

  body("customerName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Customer name cannot be empty."
    )
    .isLength({ max: 150 })
    .withMessage(
      "Customer name cannot exceed 150 characters."
    ),

  body("phoneNumber")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage(
      "Phone number cannot exceed 50 characters."
    ),

  body("pond")
    .optional()
    .isMongoId()
    .withMessage("Pond must be a valid ID."),

  body("quantitySold")
    .optional()
    .isInt({ min: 1 })
    .withMessage(
      "Quantity sold must be at least 1."
    )
    .toInt(),

  body("averageWeight")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage(
      "Average fish weight must be greater than zero."
    )
    .toFloat(),

  body("pricePerKilogram")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage(
      "Price per kilogram must be greater than zero."
    )
    .toFloat(),

  body("paymentStatus")
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage("Payment status is invalid."),

  body("amountPaid")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "Amount paid cannot be negative."
    )
    .toFloat(),

  body("paymentMethod")
    .optional()
    .isIn(PAYMENT_METHODS)
    .withMessage("Payment method is invalid."),

  body("saleDate")
    .optional()
    .isISO8601()
    .withMessage("Sale date must be valid.")
    .toDate(),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage(
      "Notes cannot exceed 2,000 characters."
    ),
];

const saleIdValidators = [
  param("id")
    .isMongoId()
    .withMessage("Sale ID must be valid."),
];

const listSaleValidators = [
  query("pond")
    .optional()
    .isMongoId()
    .withMessage("Pond must be a valid ID."),

  query("paymentStatus")
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage("Payment status is invalid."),

  query("from")
    .optional()
    .isISO8601()
    .withMessage("From date must be valid."),

  query("to")
    .optional()
    .isISO8601()
    .withMessage("To date must be valid."),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      "Search term cannot exceed 100 characters."
    ),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be at least 1.")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage(
      "Limit must be between 1 and 100."
    )
    .toInt(),
];

const salesSummaryValidators = [
  query("from")
    .optional()
    .isISO8601()
    .withMessage("From date must be valid."),

  query("to")
    .optional()
    .isISO8601()
    .withMessage("To date must be valid."),

  query("pond")
    .optional()
    .isMongoId()
    .withMessage("Pond must be a valid ID."),
];

module.exports = {
  createSaleValidators,
  updateSaleValidators,
  saleIdValidators,
  listSaleValidators,
  salesSummaryValidators,
};