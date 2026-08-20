const {
  body,
  param,
  query,
} = require("express-validator");

const GALLERY_CATEGORIES = [
  "farm",
  "pond",
  "fish",
  "growth",
  "feeding",
  "water_quality",
  "mortality",
  "equipment",
  "activity",
  "other",
];

const createGalleryValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Gallery title is required.")
    .isLength({ max: 150 })
    .withMessage(
      "Gallery title cannot exceed 150 characters.",
    ),

  body("description")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Gallery description cannot exceed 1000 characters.",
    ),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("Gallery category is required.")
    .isIn(GALLERY_CATEGORIES)
    .withMessage("Gallery category is invalid."),
];

const updateGalleryValidator = [
  param("id")
    .isMongoId()
    .withMessage("Gallery ID must be valid."),

  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Gallery title cannot be empty.")
    .isLength({ max: 150 })
    .withMessage(
      "Gallery title cannot exceed 150 characters.",
    ),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Gallery description cannot exceed 1000 characters.",
    ),

  body("category")
    .optional()
    .trim()
    .isIn(GALLERY_CATEGORIES)
    .withMessage("Gallery category is invalid."),
];

const galleryIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("Gallery ID must be valid."),
];

const listGalleryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage(
      "Limit must be between 1 and 100.",
    ),

  query("category")
    .optional()
    .trim()
    .isIn(GALLERY_CATEGORIES)
    .withMessage("Gallery category is invalid."),
];

module.exports = {
  GALLERY_CATEGORIES,
  createGalleryValidator,
  updateGalleryValidator,
  galleryIdValidator,
  listGalleryValidator,
};