const express = require("express");

const controller = require("../controllers/inventoryController");

const { protect } = require("../middleware/authMiddleware");

const {
  createInventoryValidator,
  updateInventoryValidator,
  stockValidator,
  adjustmentValidator,
  idValidator,
  transactionQueryValidator,
  inventoryQueryValidator,
} = require("../validators/inventoryValidators");

const router = express.Router();

/*
 * Every inventory endpoint requires
 * administrator authentication.
 */
router.use(protect);

/*
 * =========================================================
 * INVENTORY COLLECTION
 * =========================================================
 */

/*
 * GET /api/inventory
 *
 * Active inventory items.
 */
router.get("/", controller.getInventory);

router.get("/summary", controller.getSummary);

router.get("/low-stock", controller.getLowStock);

/*
 * Global inventory transaction ledger.
 *
 * Returns transactions across ALL inventory items.
 *
 * Optional:
 * - page
 * - limit
 * - transactionType
 * - referenceType
 * - inventoryItem
 * - search
 */
router.get("/transactions", controller.getAllTransactions);

router.post("/", createInventoryValidator, controller.createInventory);

router.get("/:id", idValidator, controller.getInventoryItem);

router.patch("/:id", updateInventoryValidator, controller.updateInventory);

router.delete("/:id", idValidator, controller.deleteInventory);

router.post("/:id/stock-in", stockValidator, controller.stockIn);

router.post("/:id/stock-out", stockValidator, controller.stockOut);

router.post("/:id/adjust", adjustmentValidator, controller.adjustQuantity);

/*
 * Individual inventory item transaction history.
 */
router.get("/:id/transactions", idValidator, controller.getTransactions);

module.exports = router;
