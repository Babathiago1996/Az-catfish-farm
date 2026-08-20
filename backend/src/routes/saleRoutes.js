const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const saleController = require("../controllers/saleController");

const {
  createSaleValidators,
  updateSaleValidators,
  saleIdValidators,
  listSaleValidators,
  salesSummaryValidators,
} = require("../validators/saleValidators");

const router = express.Router();

router.use(protect);

/*
 * Summary must come before /:id
 * so "summary" is not interpreted as
 * a Sale ID.
 */
router.get(
  "/summary",
  salesSummaryValidators,
  saleController.getSalesSummary
);

router.get(
  "/",
  listSaleValidators,
  saleController.listSales
);

router.post(
  "/",
  createSaleValidators,
  saleController.createSale
);

router.get(
  "/:id",
  saleIdValidators,
  saleController.getSale
);

router.patch(
  "/:id",
  updateSaleValidators,
  saleController.updateSale
);

module.exports = router;