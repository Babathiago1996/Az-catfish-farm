const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const controller =
  require("../controllers/customerController");

const {
  createCustomerValidators,
  updateCustomerValidators,
  customerIdValidators,
  listCustomerValidators,
  customerSummaryValidators,
} = require("../validators/customerValidators");

const router =
  express.Router();

router.use(protect);

router.get(
  "/summary",
  customerSummaryValidators,
  controller.getCustomerSummary,
);

router.get(
  "/",
  listCustomerValidators,
  controller.listCustomers,
);

router.post(
  "/",
  createCustomerValidators,
  controller.createCustomer,
);

router.get(
  "/:id",
  customerIdValidators,
  controller.getCustomer,
);

router.patch(
  "/:id",
  updateCustomerValidators,
  controller.updateCustomer,
);

router.delete(
  "/:id",
  customerIdValidators,
  controller.deleteCustomer,
);

module.exports = router;