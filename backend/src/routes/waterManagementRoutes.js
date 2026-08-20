const express = require("express");

const {
  protect
} = require("../middleware/authMiddleware");

const controller = require("../controllers/waterManagementController");

const {
  createWaterManagementValidators,
  updateWaterManagementValidators,
  waterManagementIdValidators,
  listWaterManagementValidators,
  recordWaterChangeValidators
} = require("../validators/waterManagementValidators");

const router = express.Router();

router.use(protect);

router.get(
  "/summary",
  controller.getWaterChangeSummary
);

router.get(
  "/",
  listWaterManagementValidators,
  controller.listWaterManagement
);

router.post(
  "/",
  createWaterManagementValidators,
  controller.createWaterManagement
);

router.get(
  "/:id",
  waterManagementIdValidators,
  controller.getWaterManagement
);

router.patch(
  "/:id",
  updateWaterManagementValidators,
  controller.updateWaterManagement
);

router.post(
  "/:id/water-change",
  recordWaterChangeValidators,
  controller.recordWaterChange
);

module.exports = router;