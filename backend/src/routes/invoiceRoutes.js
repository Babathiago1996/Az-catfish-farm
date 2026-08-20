const express = require("express");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  saleIdValidators
} = require("../validators/saleValidators");

const {
  getPrintableInvoice
} = require("../controllers/invoiceController");

const router = express.Router();

router.use(protect);

router.get(
  "/:id/print",
  saleIdValidators,
  getPrintableInvoice
);

module.exports = router;