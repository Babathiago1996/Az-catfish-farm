const express = require("express");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");

const authController = require("../controllers/authController");
const {
  protect
} = require("../middleware/authMiddleware");

const {
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators
} = require("../validators/authValidators");

const router = express.Router();

const authenticationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many authentication attempts. Please try again later."
  }
});

const changePasswordValidators = [
  body("currentPassword")
    .isString()
    .withMessage("Current password is required.")
    .isLength({
      min: 8,
      max: 128
    })
    .withMessage(
      "Current password must contain between 8 and 128 characters."
    ),

  body("newPassword")
    .isString()
    .withMessage("New password is required.")
    .isLength({
      min: 8,
      max: 128
    })
    .withMessage(
      "New password must contain between 8 and 128 characters."
    ),

  body("confirmPassword")
    .isString()
    .withMessage("Password confirmation is required.")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match.");
      }

      return true;
    })
];

router.post(
  "/login",
  authenticationRateLimiter,
  loginValidators,
  authController.login
);

router.post(
  "/forgot-password",
  authenticationRateLimiter,
  forgotPasswordValidators,
  authController.forgotPassword
);

router.post(
  "/reset-password",
  authenticationRateLimiter,
  resetPasswordValidators,
  authController.resetPassword
);

router.get(
  "/me",
  protect,
  authController.getMe
);

router.post(
  "/logout",
  protect,
  authController.logout
);

router.post(
  "/change-password",
  protect,
  changePasswordValidators,
  authController.changePassword
);

module.exports = router;