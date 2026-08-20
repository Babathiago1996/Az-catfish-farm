const {
  body,
  param,
  query,
} = require("express-validator");

const notificationTypes = [
  "system",
  "inventory",
  "feeding",
  "water_quality",
  "water_change",
  "mortality",
  "growth",
  "sales",
  "payment",
  "expense",
  "pond",
  "stocking",
  "equipment",
  "customer",
  "supplier",
  "security",
  "general",
];

const notificationPriorities = [
  "low",
  "normal",
  "high",
  "critical",
];

const notificationSources = [
  "system",
  "manual",
  "automation",
];

const createNotificationValidators = [
  body("type")
    .optional()
    .isIn(notificationTypes)
    .withMessage(
      "Notification type is invalid.",
    ),

  body("priority")
    .optional()
    .isIn(notificationPriorities)
    .withMessage(
      "Notification priority is invalid.",
    ),

  body("title")
    .trim()
    .notEmpty()
    .withMessage(
      "Notification title is required.",
    )
    .isLength({
      max: 200,
    })
    .withMessage(
      "Notification title cannot exceed 200 characters.",
    ),

  body("message")
    .trim()
    .notEmpty()
    .withMessage(
      "Notification message is required.",
    )
    .isLength({
      max: 2000,
    })
    .withMessage(
      "Notification message cannot exceed 2,000 characters.",
    ),

  body("relatedEntityType")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 100,
    })
    .withMessage(
      "Related entity type cannot exceed 100 characters.",
    ),

  body("relatedEntityId")
    .optional({
      nullable: true,
    })
    .custom((value) => {
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        return true;
      }

      const mongoose =
        require("mongoose");

      if (
        !mongoose.isValidObjectId(
          value,
        )
      ) {
        throw new Error(
          "Related entity ID must be valid.",
        );
      }

      return true;
    }),

  body("actionUrl")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 500,
    })
    .withMessage(
      "Action URL cannot exceed 500 characters.",
    ),

  body("metadata")
    .optional({
      nullable: true,
    })
    .isObject()
    .withMessage(
      "Notification metadata must be an object.",
    ),

  body("source")
    .optional()
    .isIn(notificationSources)
    .withMessage(
      "Notification source is invalid.",
    ),

  body("dedupeKey")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 300,
    })
    .withMessage(
      "Notification dedupe key cannot exceed 300 characters.",
    ),

  body("emailRequired")
    .optional()
    .isBoolean()
    .withMessage(
      "emailRequired must be true or false.",
    ),
];

const notificationIdValidators = [
  param("id")
    .isMongoId()
    .withMessage(
      "Notification ID must be valid.",
    ),
];

const listNotificationValidators = [
  query("type")
    .optional()
    .isIn(notificationTypes)
    .withMessage(
      "Notification type is invalid.",
    ),

  query("priority")
    .optional()
    .isIn(notificationPriorities)
    .withMessage(
      "Notification priority is invalid.",
    ),

  query("isRead")
    .optional()
    .isBoolean()
    .withMessage(
      "isRead must be true or false.",
    ),

  query("source")
    .optional()
    .isIn(notificationSources)
    .withMessage(
      "Notification source is invalid.",
    ),

  query("search")
    .optional()
    .trim()
    .isLength({
      max: 100,
    })
    .withMessage(
      "Search term cannot exceed 100 characters.",
    ),

  query("page")
    .optional()
    .isInt({
      min: 1,
    })
    .withMessage(
      "Page must be at least 1.",
    )
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: 1,
      max: 100,
    })
    .withMessage(
      "Limit must be between 1 and 100.",
    )
    .toInt(),
];

module.exports = {
  notificationTypes,
  notificationPriorities,
  notificationSources,
  createNotificationValidators,
  notificationIdValidators,
  listNotificationValidators,
};