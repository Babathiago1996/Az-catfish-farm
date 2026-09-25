/**
 * One-time cleanup for inventory records left behind by the old
 * soft-delete implementation.
 *
 * SAFETY:
 * - This script refuses to run unless CONFIRM_PURGE=YES is supplied.
 * - It only removes Inventory documents with isActive:false.
 * - It removes transactions belonging to those legacy deleted items.
 * - It also removes orphan transactions whose inventory item no longer
 *   exists at all.
 * - Active inventory items and their transactions are not touched.
 *
 * Run from backend:
 *   CONFIRM_PURGE=YES node src/scripts/purgeLegacyDeletedInventory.js
 *
 * Windows PowerShell:
 *   $env:CONFIRM_PURGE="YES"; node src/scripts/purgeLegacyDeletedInventory.js
 */

const mongoose = require("mongoose");

const {
  connectDatabase,
  disconnectDatabase,
} = require("../config/database");

const Inventory = require("../models/Inventory");
const InventoryTransaction = require("../models/InventoryTransaction");

const run = async () => {
  if (process.env.CONFIRM_PURGE !== "YES") {
    throw new Error(
      "Safety check failed. Set CONFIRM_PURGE=YES before running this one-time cleanup.",
    );
  }

  await connectDatabase();

  const inactiveItems = await Inventory.find({
    isActive: false,
  })
    .select("_id name")
    .lean();

  const inactiveIds = inactiveItems.map((item) => item._id);

  let deletedTransactionsForInactive = 0;
  let deletedInactiveItems = 0;
  let deletedOrphanTransactions = 0;

  if (inactiveIds.length) {
    const transactionResult = await InventoryTransaction.deleteMany({
      inventoryItem: { $in: inactiveIds },
    });

    deletedTransactionsForInactive = transactionResult.deletedCount || 0;

    const itemResult = await Inventory.deleteMany({
      _id: { $in: inactiveIds },
      isActive: false,
    });

    deletedInactiveItems = itemResult.deletedCount || 0;
  }

  /*
   * Remove any transaction whose referenced Inventory document no
   * longer exists. This is the final cleanup for old hard-deleted
   * inventory records from before the cascade delete was introduced.
   */
  const orphanResult = await InventoryTransaction.aggregate([
    {
      $lookup: {
        from: "inventories",
        localField: "inventoryItem",
        foreignField: "_id",
        as: "item",
      },
    },
    {
      $match: {
        item: { $eq: [] },
      },
    },
    {
      $project: {
        _id: 1,
      },
    },
  ]);

  const orphanIds = orphanResult.map((row) => row._id);

  if (orphanIds.length) {
    const orphanDeleteResult = await InventoryTransaction.deleteMany({
      _id: { $in: orphanIds },
    });

    deletedOrphanTransactions = orphanDeleteResult.deletedCount || 0;
  }

  console.log("");
  console.log("Inventory legacy cleanup completed.");
  console.log(`Legacy inactive inventory removed: ${deletedInactiveItems}`);
  console.log(
    `Transactions removed with inactive inventory: ${deletedTransactionsForInactive}`,
  );
  console.log(`Orphan transactions removed: ${deletedOrphanTransactions}`);
  console.log("");

  if (inactiveItems.length) {
    console.log("Removed legacy inactive items:");
    inactiveItems.forEach((item) => {
      console.log(`- ${item.name} (${item._id})`);
    });
  } else {
    console.log("No legacy inactive inventory items were found.");
  }
};

run()
  .catch((error) => {
    console.error("Inventory legacy cleanup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
