const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const controller = require("../controllers/expenseController");

const {
  createExpenseValidators,
  updateExpenseValidators,
  expenseIdValidators,
  listExpenseValidators,
  expenseSummaryValidators,
} = require("../validators/expenseValidators");

const router = express.Router();

/*
 * All expense endpoints require authentication.
 */
router.use(protect);

/*
 * GET /api/expenses/summary
 *
 * Must appear before /:id.
 */
router.get("/summary", expenseSummaryValidators, controller.getExpenseSummary);

/*
 * GET /api/expenses
 */
router.get("/", listExpenseValidators, controller.listExpenses);

/*
 * POST /api/expenses
 *
 * multipart/form-data
 *
 * Optional receipt image field: receiptImage
 */
router.post(
  "/",
  upload.single("receiptImage"),
  createExpenseValidators,
  controller.createExpense,
);

/*
 * GET /api/expenses/:id
 */
router.get("/:id", expenseIdValidators, controller.getExpense);

/*
 * PATCH /api/expenses/:id
 *
 * multipart/form-data
 *
 * Optional receipt image field: receiptImage
 */
router.patch(
  "/:id",
  upload.single("receiptImage"),
  updateExpenseValidators,
  controller.updateExpense,
);

/*
 * DELETE /api/expenses/:id
 */
router.delete("/:id", expenseIdValidators, controller.deleteExpense);

module.exports = router;
