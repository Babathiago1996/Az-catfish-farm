const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const controller =
  require("../controllers/analyticsController");

const {
  analyticsValidators,
} = require("../validators/analyticsValidators");

const router = express.Router();

router.use(protect);

router.get(
  "/",
  analyticsValidators,
  controller.getDashboardAnalytics,
);

router.get(
  "/financial",
  analyticsValidators,
  controller.getFinancialAnalytics,
);

router.get(
  "/sales",
  analyticsValidators,
  controller.getSalesAnalytics,
);

router.get(
  "/expenses",
  analyticsValidators,
  controller.getExpenseAnalytics,
);

router.get(
  "/production",
  analyticsValidators,
  controller.getProductionAnalytics,
);

module.exports = router;