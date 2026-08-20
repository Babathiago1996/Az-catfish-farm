const { body } = require("express-validator");

const optionalString = (
  field,
  max,
  message,
) =>
  body(field)
    .optional()
    .isString()
    .withMessage(message)
    .trim()
    .isLength({ max })
    .withMessage(
      `${field} must not exceed ${max} characters.`,
    );

const emailValidator = (field) =>
  body(field)
    .optional()
    .isEmail()
    .withMessage(
      "Please provide a valid email address.",
    )
    .normalizeEmail();

const profileValidators = [
  optionalString(
    "name",
    150,
    "Name must be a valid string.",
  ),

  optionalString(
    "phone",
    50,
    "Phone must be a valid string.",
  ),

  optionalString(
    "bio",
    1000,
    "Bio must be a valid string.",
  ),
];

const accountEmailValidators = [
  body("email")
    .isEmail()
    .withMessage(
      "Please provide a valid email address.",
    )
    .normalizeEmail(),

  body("currentPassword")
    .isString()
    .withMessage(
      "Current password is required.",
    )
    .isLength({
      min: 8,
      max: 128,
    })
    .withMessage(
      "Current password must contain between 8 and 128 characters.",
    ),
];

const changePasswordValidators = [
  body("currentPassword")
    .isString()
    .withMessage(
      "Current password is required.",
    )
    .isLength({
      min: 8,
      max: 128,
    })
    .withMessage(
      "Current password must contain between 8 and 128 characters.",
    ),

  body("newPassword")
    .isString()
    .withMessage(
      "New password is required.",
    )
    .isLength({
      min: 8,
      max: 128,
    })
    .withMessage(
      "New password must contain between 8 and 128 characters.",
    ),

  body("confirmPassword")
    .isString()
    .withMessage(
      "Password confirmation is required.",
    )
    .custom(
      (value, { req }) =>
        value === req.body.newPassword,
    )
    .withMessage(
      "Passwords do not match.",
    ),
];

const notificationFields = [
  "emailNotifications",
  "inAppNotifications",
  "waterChangeReminders",
  "feedingReminders",
  "growthReminders",
  "harvestReminders",
  "inventoryAlerts",
  "monthlyReportNotifications",
];

const notificationValidators =
  notificationFields.flatMap((field) => [
    body(field)
      .optional()
      .isBoolean()
      .withMessage(
        `${field} must be true or false.`,
      ),

    body(
      `notificationPreferences.${field}`,
    )
      .optional()
      .isBoolean()
      .withMessage(
        `${field} must be true or false.`,
      ),
  ]);

const timeRegex =
  /^([01]\d|2[0-3]):[0-5]\d$/;

const feedingValidators = [
  body("morning.enabled")
    .optional()
    .isBoolean()
    .withMessage(
      "morning.enabled must be true or false.",
    ),

  body("morning.time")
    .optional()
    .isString()
    .withMessage(
      "morning.time must be a valid time.",
    )
    .matches(timeRegex)
    .withMessage(
      "morning.time must use HH:mm format.",
    ),

  body("afternoon.enabled")
    .optional()
    .isBoolean()
    .withMessage(
      "afternoon.enabled must be true or false.",
    ),

  body("afternoon.time")
    .optional()
    .isString()
    .withMessage(
      "afternoon.time must be a valid time.",
    )
    .matches(timeRegex)
    .withMessage(
      "afternoon.time must use HH:mm format.",
    ),

  body("evening.enabled")
    .optional()
    .isBoolean()
    .withMessage(
      "evening.enabled must be true or false.",
    ),

  body("evening.time")
    .optional()
    .isString()
    .withMessage(
      "evening.time must be a valid time.",
    )
    .matches(timeRegex)
    .withMessage(
      "evening.time must use HH:mm format.",
    ),

  body("feedingSchedule.morning.enabled")
    .optional()
    .isBoolean()
    .withMessage(
      "morning.enabled must be true or false.",
    ),

  body("feedingSchedule.morning.time")
    .optional()
    .isString()
    .matches(timeRegex)
    .withMessage(
      "morning.time must use HH:mm format.",
    ),

  body("feedingSchedule.afternoon.enabled")
    .optional()
    .isBoolean()
    .withMessage(
      "afternoon.enabled must be true or false.",
    ),

  body("feedingSchedule.afternoon.time")
    .optional()
    .isString()
    .matches(timeRegex)
    .withMessage(
      "afternoon.time must use HH:mm format.",
    ),

  body("feedingSchedule.evening.enabled")
    .optional()
    .isBoolean()
    .withMessage(
      "evening.enabled must be true or false.",
    ),

  body("feedingSchedule.evening.time")
    .optional()
    .isString()
    .matches(timeRegex)
    .withMessage(
      "evening.time must use HH:mm format.",
    ),
];

const farmValidators = [
  optionalString(
    "farmName",
    150,
    "Farm name must be a valid string.",
  ),

  emailValidator("email"),

  optionalString(
    "phone",
    50,
    "Phone must be a valid string.",
  ),

  optionalString(
    "address",
    500,
    "Address must be a valid string.",
  ),

  optionalString(
    "about",
    5000,
    "About must be a valid string.",
  ),

  body("waterChangeIntervalDays")
    .optional()
    .isInt({
      min: 1,
      max: 365,
    })
    .withMessage(
      "Water-change interval must be between 1 and 365 days.",
    ),

  body("currency")
    .optional()
    .isString()
    .trim()
    .isLength({
      min: 3,
      max: 10,
    })
    .withMessage(
      "Currency must contain between 3 and 10 characters.",
    ),

  body("timeZone")
    .optional()
    .isString()
    .trim()
    .isLength({
      min: 1,
      max: 100,
    })
    .withMessage(
      "Time zone must be valid.",
    ),

  body("socialLinks")
    .optional()
    .isObject()
    .withMessage(
      "socialLinks must be an object.",
    ),

  body("socialLinks.facebook")
    .optional()
    .isURL()
    .withMessage(
      "Facebook URL must be valid.",
    ),

  body("socialLinks.instagram")
    .optional()
    .isURL()
    .withMessage(
      "Instagram URL must be valid.",
    ),

  body("socialLinks.whatsapp")
    .optional()
    .isURL()
    .withMessage(
      "WhatsApp URL must be valid.",
    ),

  body("socialLinks.tiktok")
    .optional()
    .isURL()
    .withMessage(
      "TikTok URL must be valid.",
    ),

  body("socialLinks.youtube")
    .optional()
    .isURL()
    .withMessage(
      "YouTube URL must be valid.",
    ),

  body("socialLinks.twitter")
    .optional()
    .isURL()
    .withMessage(
      "Twitter URL must be valid.",
    ),
];

const updateSettingsValidator = [
  ...farmValidators,
  ...notificationValidators,
  ...feedingValidators,
];

module.exports = {
  profileValidators,
  accountEmailValidators,
  changePasswordValidators,
  notificationValidators,
  feedingValidators,
  farmValidators,
  updateSettingsValidator,
};