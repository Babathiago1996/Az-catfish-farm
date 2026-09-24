const { param } = require("express-validator");

const auditYearValidators = [
  param("year")
    .isInt({ min: 2000, max: 2100 })
    .withMessage("Audit year must be a valid year between 2000 and 2100."),
];

module.exports = {
  auditYearValidators,
};
