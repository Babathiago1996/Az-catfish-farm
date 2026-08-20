const {
  body,
  param,
  query,
} = require("express-validator");

const SUPPLIER_STATUSES = [
  "active",
  "inactive",
];

const createSupplierValidators = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Supplier name is required.")
    .isLength({ max: 150 })
    .withMessage(
      "Supplier name cannot exceed 150 characters.",
    ),

  body("contactPerson")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage(
      "Contact person cannot exceed 150 characters.",
    ),

  body("phoneNumber")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage(
      "Phone number cannot exceed 50 characters.",
    ),

  body("email")
    .optional({ nullable: true })
    .trim()
    .isEmail()
    .withMessage("Supplier email must be valid.")
    .isLength({ max: 150 })
    .withMessage(
      "Supplier email cannot exceed 150 characters.",
    )
    .normalizeEmail(),

  body("address")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage(
      "Supplier address cannot exceed 300 characters.",
    ),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage(
      "Notes cannot exceed 2,000 characters.",
    ),

  body("status")
    .optional()
    .isIn(SUPPLIER_STATUSES)
    .withMessage("Supplier status is invalid."),
];

const updateSupplierValidators = [
  param("id")
    .isMongoId()
    .withMessage("Supplier ID must be valid."),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Supplier name cannot be empty.",
    )
    .isLength({ max: 150 })
    .withMessage(
      "Supplier name cannot exceed 150 characters.",
    ),

  body("contactPerson")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage(
      "Contact person cannot exceed 150 characters.",
    ),

  body("phoneNumber")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage(
      "Phone number cannot exceed 50 characters.",
    ),

  body("email")
    .optional({ nullable: true })
    .trim()
    .isEmail()
    .withMessage("Supplier email must be valid.")
    .isLength({ max: 150 })
    .withMessage(
      "Supplier email cannot exceed 150 characters.",
    )
    .normalizeEmail(),

  body("address")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage(
      "Supplier address cannot exceed 300 characters.",
    ),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage(
      "Notes cannot exceed 2,000 characters.",
    ),

  body("status")
    .optional()
    .isIn(SUPPLIER_STATUSES)
    .withMessage("Supplier status is invalid."),
];

const supplierIdValidators = [
  param("id")
    .isMongoId()
    .withMessage("Supplier ID must be valid."),
];

const listSupplierValidators = [
  query("status")
    .optional()
    .isIn(SUPPLIER_STATUSES)
    .withMessage("Supplier status is invalid."),

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

module.exports = {
  SUPPLIER_STATUSES,
  createSupplierValidators,
  updateSupplierValidators,
  supplierIdValidators,
  listSupplierValidators,
};