const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const controller =
  require("../controllers/dailyActivityController");

const {
  createDailyActivityValidator,
  updateDailyActivityValidator,
  dailyActivityIdValidator,
  dailyActivityQueryValidator,
  dailyActivitySummaryValidator,
} = require("../validators/dailyActivityValidators");

const router =
  express.Router();

router.use(protect);

router.get(
  "/summary",
  dailyActivitySummaryValidator,
  controller.getDailySummary,
);

router.get(
  "/",
  dailyActivityQueryValidator,
  controller.getActivities,
);

router.get(
  "/:id",
  dailyActivityIdValidator,
  controller.getActivity,
);

router.post(
  "/",
  createDailyActivityValidator,
  controller.createActivity,
);

router.patch(
  "/:id",
  updateDailyActivityValidator,
  controller.updateActivity,
);

router.delete(
  "/:id",
  dailyActivityIdValidator,
  controller.deleteActivity,
);

module.exports = router;