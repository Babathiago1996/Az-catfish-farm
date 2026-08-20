const {
  body
} = require("express-validator");

const emailValidation = body("email")
  .trim()
  .normalizeEmail()
  .isEmail()
  .withMessage("Please provide a valid email address.")
  .isLength({
    max: 254
  })
  .withMessage("Email address is too long.");

const passwordValidation = body("password")
  .isString()
  .withMessage("Password must be a string.")
  .isLength({
    min: 8,
    max: 128
  })
  .withMessage(
    "Password must contain between 8 and 128 characters."
  );

const loginValidators = [
  emailValidation,
  passwordValidation
];

const forgotPasswordValidators = [
  emailValidation
];

const resetPasswordValidators = [
  body("token")
    .isString()
    .withMessage("Reset token is required.")
    .trim()
    .notEmpty()
    .withMessage("Reset token is required."),

  body("password")
    .isString()
    .withMessage("Password must be a string.")
    .isLength({
      min: 8,
      max: 128
    })
    .withMessage(
      "Password must contain between 8 and 128 characters."
    ),

  body("confirmPassword")
    .isString()
    .withMessage("Password confirmation must be a string.")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match.");
      }

      return true;
    })
];

module.exports = {
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators
};