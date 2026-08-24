const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const controller = require("../controllers/waterManagementController");

const {
  createWaterManagementValidators,
  updateWaterManagementValidators,
  waterManagementIdValidators,
  listWaterManagementValidators,
  recordWaterChangeValidators,
} = require("../validators/waterManagementValidators");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
*/

router.get(
  "/summary",
  controller.getWaterChangeSummary,
);

/*
|--------------------------------------------------------------------------
| List
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  listWaterManagementValidators,
  controller.listWaterManagement,
);

/*
|--------------------------------------------------------------------------
| Create / Upsert
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  createWaterManagementValidators,
  controller.createWaterManagement,
);

/*
|--------------------------------------------------------------------------
| Get One
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  waterManagementIdValidators,
  controller.getWaterManagement,
);

/*
|--------------------------------------------------------------------------
| Update
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id",
  updateWaterManagementValidators,
  controller.updateWaterManagement,
);

/*
|--------------------------------------------------------------------------
| Record Actual Water Change
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/water-change",
  recordWaterChangeValidators,
  controller.recordWaterChange,
);

module.exports = router;