const {
  query,
} = require("express-validator");

const dashboardValidators = [
  query("from")
    .optional()
    .isISO8601()
    .withMessage(
      "From date must be valid.",
    ),

  query("to")
    .optional()
    .isISO8601()
    .withMessage(
      "To date must be valid.",
    ),

  query("pond")
    .optional()
    .isMongoId()
    .withMessage(
      "Pond must be a valid ID.",
    ),

  query("activityLimit")
    .optional()
    .isInt({
      min: 1,
      max: 50,
    })
    .withMessage(
      "Activity limit must be between 1 and 50.",
    ),
];

module.exports = {
  dashboardValidators,
};