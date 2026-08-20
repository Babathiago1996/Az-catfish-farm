const express = require("express");

const {
  protect
} = require("../middleware/authMiddleware");

const controller = require("../controllers/growthController");

const {
  createGrowthValidators,
  updateGrowthValidators,
  growthIdValidators,
  listGrowthValidators,
  growthAnalyticsValidators
} = require("../validators/growthValidators");

const router = express.Router();

router.use(protect);

router.get(
  "/analytics",
  growthAnalyticsValidators,
  controller.getGrowthAnalytics
);

router.get(
  "/",
  listGrowthValidators,
  controller.listGrowthRecords
);

router.post(
  "/",
  createGrowthValidators,
  controller.createGrowthRecord
);

router.get(
  "/:id",
  growthIdValidators,
  controller.getGrowthRecord
);

router.patch(
  "/:id",
  updateGrowthValidators,
  controller.updateGrowthRecord
);

module.exports = router;