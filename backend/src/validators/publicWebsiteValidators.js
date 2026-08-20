const {
  query,
} = require("express-validator");

const galleryCategories = [
  "pond",
  "fish",
  "farm",
  "feeding",
  "growth",
  "harvest",
  "facility",
  "equipment",
  "other",
];

const publicGalleryValidators = [
  query("category")
    .optional()
    .trim()
    .toLowerCase()
    .isIn(galleryCategories)
    .withMessage(
      "Gallery category is invalid.",
    ),

  query("page")
    .optional()
    .isInt({
      min: 1,
    })
    .withMessage(
      "Page must be a positive integer.",
    ),

  query("limit")
    .optional()
    .isInt({
      min: 1,
      max: 24,
    })
    .withMessage(
      "Limit must be between 1 and 24.",
    ),
];

module.exports = {
  publicGalleryValidators,
  galleryCategories,
};