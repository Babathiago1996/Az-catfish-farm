const {
  body,
  param,
  query,
} = require("express-validator");

const CUSTOMER_STATUSES = [
  "active",
  "inactive",
];

const createCustomerValidators = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Customer name is required.")
    .isLength({ max: 150 })
    .withMessage(
      "Customer name cannot exceed 150 characters.",
    ),

  body("phoneNumber")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage(
      "Phone number cannot exceed 50 characters.",
    ),

  body("email")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Customer email must be valid.")
    .isLength({ max: 150 })
    .withMessage(
      "Customer email cannot exceed 150 characters.",
    )
    .normalizeEmail(),

  body("address")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage(
      "Customer address cannot exceed 300 characters.",
    ),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage(
      "Customer notes cannot exceed 2,000 characters.",
    ),

  body("status")
    .optional()
    .isIn(CUSTOMER_STATUSES)
    .withMessage("Customer status is invalid."),
];

const updateCustomerValidators = [
  param("id")
    .isMongoId()
    .withMessage("Customer ID must be valid."),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Customer name cannot be empty.",
    )
    .isLength({ max: 150 })
    .withMessage(
      "Customer name cannot exceed 150 characters.",
    ),

  body("phoneNumber")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage(
      "Phone number cannot exceed 50 characters.",
    ),

  body("email")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Customer email must be valid.")
    .isLength({ max: 150 })
    .withMessage(
      "Customer email cannot exceed 150 characters.",
    )
    .normalizeEmail(),

  body("address")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage(
      "Customer address cannot exceed 300 characters.",
    ),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage(
      "Customer notes cannot exceed 2,000 characters.",
    ),

  body("status")
    .optional()
    .isIn(CUSTOMER_STATUSES)
    .withMessage("Customer status is invalid."),
];

const customerIdValidators = [
  param("id")
    .isMongoId()
    .withMessage("Customer ID must be valid."),
];

const listCustomerValidators = [
  query("status")
    .optional()
    .isIn(CUSTOMER_STATUSES)
    .withMessage("Customer status is invalid."),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      "Search term cannot exceed 100 characters.",
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
      "Limit must be between 1 and 100.",
    )
    .toInt(),
];

const customerSummaryValidators = [
  query("status")
    .optional()
    .isIn(CUSTOMER_STATUSES)
    .withMessage("Customer status is invalid."),
];

module.exports = {
  CUSTOMER_STATUSES,
  createCustomerValidators,
  updateCustomerValidators,
  customerIdValidators,
  listCustomerValidators,
  customerSummaryValidators,
};