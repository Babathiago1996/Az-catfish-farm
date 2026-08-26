const express = require("express");

const {
  protect
} = require("../middleware/authMiddleware");

const stockingController = require("../controllers/stockingController");

const {
  createStockingValidators,
  updateStockingValidators,
  stockingIdValidators,
  listStockingValidators
} = require("../validators/stockingValidators");

const router = express.Router();

router.use(protect);

router.get(
  "/",
  listStockingValidators,
  stockingController.listStocking
);

router.post(
  "/",
  createStockingValidators,
  stockingController.createStocking
);

router.get(
  "/:id",
  stockingIdValidators,
  stockingController.getStocking
);

router.patch(
  "/:id",
  stockingIdValidators,
  updateStockingValidators,
  stockingController.updateStocking
);

router.delete(
  "/:id",
  stockingIdValidators,
  stockingController.deleteStocking
);

module.exports = router;