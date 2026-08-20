const {
  body,
  param,
  query,
} = require("express-validator");

const INVENTORY_CATEGORIES = [
  "feed",
  "salt",
  "medicine",
  "nets",
  "buckets",
  "pipes",
  "fuel",
  "equipment",
  "other",
];

const TRANSACTION_TYPES = [
  "stock_in",
  "stock_out",
  "adjustment",
  "return",
  "damaged",
  "expired",
];

const REFERENCE_TYPES = [
  "feeding",
  "expense",
  "manual",
  "purchase",
  "adjustment",
  "other",
];

const mongoIdMessage =
  "Must be a valid MongoDB ID.";

const idValidator = [
  param("id")
    .isMongoId()
    .withMessage(
      mongoIdMessage
    ),
];

const createInventoryValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage(
      "Inventory item name is required."
    )
    .isLength({
      max: 200,
    })
    .withMessage(
      "Inventory item name cannot exceed 200 characters."
    ),

  body("category")
    .optional({
      nullable: true,
    })
    .isIn(INVENTORY_CATEGORIES)
    .withMessage(
      "Invalid inventory category."
    ),

  body("description")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Description must be text."
    )
    .isLength({
      max: 2000,
    })
    .withMessage(
      "Description cannot exceed 2000 characters."
    ),

  body("quantity")
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage(
      "Quantity must be zero or greater."
    ),

  body("unit")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Unit must be text."
    )
    .isLength({
      max: 50,
    })
    .withMessage(
      "Unit cannot exceed 50 characters."
    ),

  body("reorderLevel")
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage(
      "Reorder level must be zero or greater."
    ),

  body("unitCost")
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage(
      "Unit cost must be zero or greater."
    ),

  body("supplier")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Supplier must be text."
    )
    .isLength({
      max: 200,
    })
    .withMessage(
      "Supplier cannot exceed 200 characters."
    ),

  body("storageLocation")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Storage location must be text."
    )
    .isLength({
      max: 200,
    })
    .withMessage(
      "Storage location cannot exceed 200 characters."
    ),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage(
      "isActive must be true or false."
    ),

  body("notes")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Notes must be text."
    )
    .isLength({
      max: 2000,
    })
    .withMessage(
      "Notes cannot exceed 2000 characters."
    ),
];

const updateInventoryValidator = [
  ...idValidator,

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Inventory item name cannot be empty."
    )
    .isLength({
      max: 200,
    })
    .withMessage(
      "Inventory item name cannot exceed 200 characters."
    ),

  body("category")
    .optional({
      nullable: true,
    })
    .isIn(INVENTORY_CATEGORIES)
    .withMessage(
      "Invalid inventory category."
    ),

  body("description")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Description must be text."
    ),

  body("unit")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Unit must be text."
    ),

  body("reorderLevel")
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage(
      "Reorder level must be zero or greater."
    ),

  body("unitCost")
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage(
      "Unit cost must be zero or greater."
    ),

  body("supplier")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Supplier must be text."
    ),

  body("storageLocation")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Storage location must be text."
    ),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage(
      "isActive must be true or false."
    ),

  body("notes")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Notes must be text."
    ),
];

const stockValidator = [
  ...idValidator,

  body("quantity")
    .isFloat({
      gt: 0,
    })
    .withMessage(
      "Quantity must be greater than zero."
    ),

  body("unitCost")
    .optional()
    .isFloat({
      min: 0,
    })
    .withMessage(
      "Unit cost must be zero or greater."
    ),

  body("referenceType")
    .optional()
    .isIn(REFERENCE_TYPES)
    .withMessage(
      "Invalid inventory reference type."
    ),

  body("referenceId")
    .optional({
      nullable: true,
    })
    .isMongoId()
    .withMessage(
      "Reference ID must be a valid MongoDB ID."
    ),

  body("notes")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Notes must be text."
    )
    .isLength({
      max: 2000,
    })
    .withMessage(
      "Notes cannot exceed 2000 characters."
    ),
];

const adjustmentValidator = [
  ...idValidator,

  body("quantity")
    .isFloat({
      min: 0,
    })
    .withMessage(
      "New quantity must be zero or greater."
    ),

  body("notes")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Notes must be text."
    )
    .isLength({
      max: 2000,
    })
    .withMessage(
      "Notes cannot exceed 2000 characters."
    ),
];

const inventoryQueryValidator = [
  query("category")
    .optional()
    .isIn(INVENTORY_CATEGORIES)
    .withMessage(
      "Invalid inventory category."
    ),

  query("status")
    .optional()
    .isIn([
      "healthy",
      "low_stock",
      "stockout",
    ])
    .withMessage(
      "Invalid inventory status."
    ),

  query("lowStock")
    .optional()
    .isBoolean()
    .withMessage(
      "lowStock must be true or false."
    ),

  query("search")
    .optional()
    .isString()
    .withMessage(
      "Search must be text."
    ),
];

const transactionQueryValidator = [
  query("page")
    .optional()
    .isInt({
      min: 1,
    })
    .withMessage(
      "Page must be a positive integer."
    ),

  query("limit")
    .optional()
    .isInt({
      min: 1,
      max: 200,
    })
    .withMessage(
      "Limit must be between 1 and 200."
    ),

  query("transactionType")
    .optional()
    .isIn(TRANSACTION_TYPES)
    .withMessage(
      "Invalid transaction type."
    ),

  query("referenceType")
    .optional()
    .isIn(REFERENCE_TYPES)
    .withMessage(
      "Invalid reference type."
    ),

  query("inventoryItem")
    .optional()
    .isMongoId()
    .withMessage(
      "Inventory item must be a valid MongoDB ID."
    ),

  query("search")
    .optional()
    .isString()
    .withMessage(
      "Search must be text."
    ),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage(
      "Start date must be a valid date."
    ),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage(
      "End date must be a valid date."
    ),
];

module.exports = {
  createInventoryValidator,
  updateInventoryValidator,
  stockValidator,
  adjustmentValidator,
  idValidator,
  inventoryQueryValidator,
  transactionQueryValidator,
};