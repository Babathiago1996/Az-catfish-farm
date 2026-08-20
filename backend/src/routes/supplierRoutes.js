const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const controller =
  require("../controllers/supplierController");

const {
  createSupplierValidators,
  updateSupplierValidators,
  supplierIdValidators,
  listSupplierValidators,
} = require("../validators/supplierValidators");

const router =
  express.Router();

router.use(protect);

router.get(
  "/",
  listSupplierValidators,
  controller.listSuppliers,
);

router.post(
  "/",
  createSupplierValidators,
  controller.createSupplier,
);

router.get(
  "/:id",
  supplierIdValidators,
  controller.getSupplier,
);

router.patch(
  "/:id",
  updateSupplierValidators,
  controller.updateSupplier,
);

router.delete(
  "/:id",
  supplierIdValidators,
  controller.deleteSupplier,
);

module.exports = router;