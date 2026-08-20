const express = require("express");

const {
  protect
} = require("../middleware/authMiddleware");

const controller = require("../controllers/mortalityController");

const {
  createMortalityValidators,
  updateMortalityValidators,
  mortalityIdValidators,
  listMortalityValidators,
  mortalitySummaryValidators
} = require("../validators/mortalityValidators");

const router = express.Router();

router.use(protect);

router.get(
  "/summary",
  mortalitySummaryValidators,
  controller.getMortalitySummary
);

router.get(
  "/",
  listMortalityValidators,
  controller.listMortality
);

router.post(
  "/",
  createMortalityValidators,
  controller.createMortality
);

router.get(
  "/:id",
  mortalityIdValidators,
  controller.getMortality
);

router.patch(
  "/:id",
  updateMortalityValidators,
  controller.updateMortality
);

module.exports = router;