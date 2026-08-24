const { body, param, query } = require("express-validator");

const categories = [
  "feed",
  "fuel",
  "fingerlings",
  "medicine",
  "repairs",
  "transportation",
  "utilities",
  "other",
];

const createExpenseValidators = [
  body("category").isIn(categories).withMessage("Expense category is invalid."),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Expense description is required.")
    .isLength({ max: 300 })
    .withMessage("Description cannot exceed 300 characters."),

  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Expense amount must be greater than zero.")
    .toFloat(),

  body("expenseDate")
    .optional()
    .isISO8601()
    .withMessage("Expense date must be valid.")
    .toDate(),

  body("vendor")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage("Vendor cannot exceed 150 characters."),

  body("reference")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Reference cannot exceed 100 characters."),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Notes cannot exceed 2,000 characters."),

  /*
   * receiptImage is populated server-side from the
   * uploaded file (see uploadMiddleware in the route),
   * not typed in by the person, so it no longer needs
   * to look like a URL here.
   */
  body("receiptImage")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Receipt image is invalid."),
];

const updateExpenseValidators = [
  param("id").isMongoId().withMessage("Expense ID must be valid."),

  body("category")
    .optional()
    .isIn(categories)
    .withMessage("Expense category is invalid."),

  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Expense description cannot be empty.")
    .isLength({ max: 300 })
    .withMessage("Description cannot exceed 300 characters."),

  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Expense amount must be greater than zero.")
    .toFloat(),

  body("expenseDate")
    .optional()
    .isISO8601()
    .withMessage("Expense date must be valid.")
    .toDate(),

  body("vendor")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage("Vendor cannot exceed 150 characters."),

  body("reference")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Reference cannot exceed 100 characters."),

  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Notes cannot exceed 2,000 characters."),
  body("receiptImage")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Receipt image is invalid."),

  body("removeReceiptImage")
    .optional()
    .isBoolean()
    .withMessage("removeReceiptImage must be true or false.")
    .toBoolean(),
];

const expenseIdValidators = [
  param("id").isMongoId().withMessage("Expense ID must be valid."),
];

const listExpenseValidators = [
  query("category")
    .optional()
    .isIn(categories)
    .withMessage("Expense category is invalid."),

  query("from").optional().isISO8601().withMessage("From date must be valid."),

  query("to").optional().isISO8601().withMessage("To date must be valid."),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search term cannot exceed 100 characters."),

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

const expenseSummaryValidators = [
  query("from").optional().isISO8601().withMessage("From date must be valid."),

  query("to").optional().isISO8601().withMessage("To date must be valid."),

  query("category")
    .optional()
    .isIn(categories)
    .withMessage("Expense category is invalid."),
];

module.exports = {
  categories,
  createExpenseValidators,
  updateExpenseValidators,
  expenseIdValidators,
  listExpenseValidators,
  expenseSummaryValidators,
};