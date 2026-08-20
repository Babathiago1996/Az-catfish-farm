const express = require("express");

const rateLimit =
  require("express-rate-limit");

const controller =
  require("../controllers/publicWebsiteController");

const {
  publicGalleryValidators,
} = require("../validators/publicWebsiteValidators");

const router =
  express.Router();

const publicWebsiteRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 300,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
      success: false,

      message:
        "Too many public website requests. Please try again later.",
    },
  });

router.use(
  publicWebsiteRateLimiter,
);

router.get(
  "/",
  controller.getHomePage,
);

router.get(
  "/home",
  controller.getHomePage,
);

router.get(
  "/about",
  controller.getAboutPage,
);

router.get(
  "/contact",
  controller.getContactPage,
);

router.get(
  "/overview",
  controller.getPondOverview,
);

router.get(
  "/gallery",
  publicGalleryValidators,
  controller.getGallery,
);

router.get(
  "/content",
  publicGalleryValidators,
  controller.getPublicWebsiteData,
);

module.exports = router;