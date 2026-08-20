const express = require("express");

const {
  protect
} = require("../middleware/authMiddleware");

const stockingController = require("../controllers/stockingController");

const {
  createStockingValidators,
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

module.exports = router;