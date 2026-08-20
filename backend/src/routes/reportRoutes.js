const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const controller =
  require("../controllers/reportController");

const {
  reportValidators,
} = require("../validators/reportValidators");

const router =
  express.Router();

router.use(protect);

/*
|--------------------------------------------------------------------------
| Complete Farm Report
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  reportValidators,
  controller.getReport,
);

/*
|--------------------------------------------------------------------------
| Financial Report
|--------------------------------------------------------------------------
*/

router.get(
  "/financial",
  reportValidators,
  controller.getFinancialReport,
);

/*
|--------------------------------------------------------------------------
| Sales Report
|--------------------------------------------------------------------------
*/

router.get(
  "/sales",
  reportValidators,
  controller.getSalesReport,
);

/*
|--------------------------------------------------------------------------
| Expense Report
|--------------------------------------------------------------------------
*/

router.get(
  "/expenses",
  reportValidators,
  controller.getExpenseReport,
);

/*
|--------------------------------------------------------------------------
| Production Report
|--------------------------------------------------------------------------
*/

router.get(
  "/production",
  reportValidators,
  controller.getProductionReport,
);

module.exports = router;