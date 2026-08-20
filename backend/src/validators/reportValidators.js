const {
  query,
} = require("express-validator");

const reportValidators = [
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
];

module.exports = {
  reportValidators,
};