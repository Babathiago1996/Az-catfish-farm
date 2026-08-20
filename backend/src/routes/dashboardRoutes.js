const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const controller =
  require("../controllers/dashboardController");

const {
  dashboardValidators,
} = require("../validators/dashboardValidators");

const router =
  express.Router();

router.use(protect);

router.get(
  "/",
  dashboardValidators,
  controller.getDashboard,
);

module.exports = router;