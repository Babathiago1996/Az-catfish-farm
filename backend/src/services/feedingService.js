const mongoose = require("mongoose");

const FeedingRecord = require("../models/FeedingRecord");
const Pond = require("../models/Pond");
const Inventory = require("../models/Inventory");
const InventoryTransaction = require("../models/InventoryTransaction");
const ActivityLog = require("../models/ActivityLog");
const {
  notifyFeedingCreated,
} = require("../services/notificationAutomationService");

const dateStart = (value) => {
  const date = new Date(value);

  date.setHours(0, 0, 0, 0);

  return date;
};

const dateEnd = (value) => {
  const date = new Date(value);

  date.setHours(23, 59, 59, 999);

  return date;
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Find the feed inventory item by feed brand/name.
 *
 * Inventory model uses:
 * - name
 * - category
 * - quantity
 * - unit
 * - unitCost
 *
 * This previously also required category === "feed", which
 * meant a correctly-named inventory item filed under any
 * other category (or a category chosen slightly differently
 * than expected) would silently fail to link, showing
 * "Not linked" even though the names matched exactly.
 *
 * Matching on name alone is safe: inventory item names are
 * already enforced to be unique among active items
 * (see inventoryService.createItem), so there can never be
 * two different active items sharing a name across
 * categories to create ambiguity here.
 */
const findFeedInventory = async ({ brand, session }) => {
  const regexBrand = new RegExp(
    `^${escapeRegex(String(brand || "").trim())}$`,
    "i",
  );

  return Inventory.findOne({
    name: regexBrand,
    isActive: true,
  }).session(session);
};

/**
 * Undo any inventory deduction previously made by a
 * feeding record. Finds every InventoryTransaction that
 * references this feeding, adds its quantity back to the
 * linked inventory item, then removes the transaction —
 * used by both updateFeeding (before recomputing against
 * the new data) and deleteFeeding.
 */
const reverseFeedingInventory = async ({ feedingId, session }) => {
  const transactions = await InventoryTransaction.find({
    referenceType: "feeding",
    referenceId: feedingId,
  }).session(session);

  for (const transaction of transactions) {
    const inventoryItem = await Inventory.findById(
      transaction.inventoryItem,
    ).session(session);

    if (inventoryItem) {
      inventoryItem.quantity =
        Number(inventoryItem.quantity || 0) + Number(transaction.quantity || 0);

      await inventoryItem.save({ session });
    }

    await InventoryTransaction.deleteOne({
      _id: transaction._id,
    }).session(session);
  }
};

/**
 * Create a feeding record and deduct the consumed feed
 * from inventory when a matching inventory item exists.
 */
const createFeeding = async ({ data, ipAddress, userAgent }) => {
  if (!mongoose.isValidObjectId(data.pond)) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  const pond = await Pond.findById(data.pond);

  if (!pond) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  if (pond.status === "inactive" || pond.status === "maintenance") {
    return {
      success: false,
      reason: "POND_UNAVAILABLE",
    };
  }

  const quantity = Number(data.quantityUsed);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      success: false,
      reason: "INVALID_QUANTITY",
    };
  }

  const session = await mongoose.startSession();

  try {
    let feeding = null;
    let inventoryItem = null;
    let remainingFeed = null;
    let inventoryUpdated = false;

    await session.withTransaction(async () => {
      inventoryItem = await findFeedInventory({
        brand: data.feedBrand,
        session,
      });

      /*
       * If matching feed inventory exists, make sure
       * the feeding unit matches the inventory unit.
       */
      if (inventoryItem) {
        const inventoryUnit = String(inventoryItem.unit || "")
          .trim()
          .toLowerCase();

        const feedingUnit = String(data.quantityUnit || "kg")
          .trim()
          .toLowerCase();

        if (inventoryUnit !== feedingUnit) {
          const error = new Error("FEED_UNIT_MISMATCH");

          error.code = "FEED_UNIT_MISMATCH";
          error.inventoryUnit = inventoryUnit;
          error.feedingUnit = feedingUnit;

          throw error;
        }

        const available = Number(inventoryItem.quantity || 0);

        if (available < quantity) {
          const error = new Error("INSUFFICIENT_FEED");

          error.code = "INSUFFICIENT_FEED";
          error.available = available;

          throw error;
        }

        const previousQuantity = available;
        const newQuantity = previousQuantity - quantity;

        /*
         * Create the feeding record first so its ID
         * can be used as the inventory transaction reference.
         */
        const records = await FeedingRecord.create(
          [
            {
              date: data.date || new Date(),

              pond: pond._id,

              feedBrand: data.feedBrand,

              feedType: data.feedType,

              feedSize: data.feedSize,

              feedSizeUnit: data.feedSizeUnit || "mm",

              quantityUsed: quantity,

              quantityUnit: data.quantityUnit || "kg",

              feedingTime: data.feedingTime,

              cost: Number(data.cost || 0),

              estimatedBiomassBeforeFeeding:
                data.estimatedBiomassBeforeFeeding ?? null,

              notes: data.notes || "",
            },
          ],
          {
            session,
          },
        );

        feeding = records[0];

        /*
         * Deduct feed from inventory.
         */
        inventoryItem.quantity = newQuantity;

        await inventoryItem.save({
          session,
        });

        /*
         * Record the inventory movement.
         */
        await InventoryTransaction.create(
          [
            {
              inventoryItem: inventoryItem._id,

              transactionType: "stock_out",

              quantity,

              previousQuantity,

              newQuantity,

              unitCost: Number(inventoryItem.unitCost || 0),

              referenceType: "feeding",

              referenceId: feeding._id,

              notes: `Feed consumed by ${pond.name}.`,
            },
          ],
          {
            session,
          },
        );

        remainingFeed = newQuantity;
        inventoryUpdated = true;

        return;
      }

      /*
       * No matching inventory item exists.
       *
       * We still allow the feeding record to be created.
       * Inventory is simply not updated.
       */
      const records = await FeedingRecord.create(
        [
          {
            date: data.date || new Date(),

            pond: pond._id,

            feedBrand: data.feedBrand,

            feedType: data.feedType,

            feedSize: data.feedSize,

            feedSizeUnit: data.feedSizeUnit || "mm",

            quantityUsed: quantity,

            quantityUnit: data.quantityUnit || "kg",

            feedingTime: data.feedingTime,

            cost: Number(data.cost || 0),

            estimatedBiomassBeforeFeeding:
              data.estimatedBiomassBeforeFeeding ?? null,

            notes: data.notes || "",
          },
        ],
        {
          session,
        },
      );

      feeding = records[0];

      remainingFeed = null;
      inventoryUpdated = false;
    });

    /*
     * ActivityLog is intentionally created after
     * the transaction succeeds.
     */
    await ActivityLog.create({
      action: "feeding",

      entityType: "FeedingRecord",

      entityId: feeding._id,

      description: `Recorded ${quantity} ${
        data.quantityUnit || "kg"
      } of feed for pond "${pond.name}".`,

      metadata: {
        pondId: pond._id,

        quantityUsed: quantity,

        quantityUnit: data.quantityUnit || "kg",

        feedBrand: data.feedBrand,

        feedType: data.feedType,

        feedSize: data.feedSize,

        feedSizeUnit: data.feedSizeUnit || "mm",

        inventoryUpdated,
      },

      ipAddress: ipAddress || "",

      userAgent: userAgent || "",
    });

    await notifyFeedingCreated({
      feeding,
      pondName: pond.name || "Pond",
    });

    return {
      success: true,

      feeding,

      remainingFeed,

      inventoryUpdated,
    };
  } catch (error) {
    if (error.code === "INSUFFICIENT_FEED") {
      return {
        success: false,

        reason: "INSUFFICIENT_FEED",

        available: error.available,
      };
    }

    if (error.code === "FEED_UNIT_MISMATCH") {
      return {
        success: false,

        reason: "FEED_UNIT_MISMATCH",

        inventoryUnit: error.inventoryUnit,

        feedingUnit: error.feedingUnit,
      };
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Update a feeding record.
 *
 * Reverses whatever inventory deduction the record
 * previously made, then recomputes the deduction against
 * the new data — same rules as createFeeding (unit must
 * match, enough stock must be available).
 */
const updateFeeding = async ({ id, data, ipAddress, userAgent }) => {
  if (!mongoose.isValidObjectId(id)) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  if (!mongoose.isValidObjectId(data.pond)) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  const pond = await Pond.findById(data.pond);

  if (!pond) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  if (pond.status === "inactive" || pond.status === "maintenance") {
    return {
      success: false,
      reason: "POND_UNAVAILABLE",
    };
  }

  const quantity = Number(data.quantityUsed);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      success: false,
      reason: "INVALID_QUANTITY",
    };
  }

  const session = await mongoose.startSession();

  try {
    let updatedFeedingId = null;
    let inventoryUpdated = false;
    let remainingFeed = null;

    await session.withTransaction(async () => {
      const feeding = await FeedingRecord.findById(id).session(session);

      if (!feeding) {
        const error = new Error("Feeding record not found.");

        error.code = "NOT_FOUND";

        throw error;
      }

      /*
       * Undo whatever this record previously deducted so we
       * can cleanly recompute it against the new data below,
       * whether the brand, quantity, or both changed.
       */
      await reverseFeedingInventory({
        feedingId: feeding._id,
        session,
      });

      const inventoryItem = await findFeedInventory({
        brand: data.feedBrand,
        session,
      });

      if (inventoryItem) {
        const inventoryUnit = String(inventoryItem.unit || "")
          .trim()
          .toLowerCase();

        const feedingUnit = String(data.quantityUnit || "kg")
          .trim()
          .toLowerCase();

        if (inventoryUnit !== feedingUnit) {
          const error = new Error("FEED_UNIT_MISMATCH");

          error.code = "FEED_UNIT_MISMATCH";
          error.inventoryUnit = inventoryUnit;
          error.feedingUnit = feedingUnit;

          throw error;
        }

        const available = Number(inventoryItem.quantity || 0);

        if (available < quantity) {
          const error = new Error("INSUFFICIENT_FEED");

          error.code = "INSUFFICIENT_FEED";
          error.available = available;

          throw error;
        }

        const previousQuantity = available;
        const newQuantity = previousQuantity - quantity;

        inventoryItem.quantity = newQuantity;

        await inventoryItem.save({ session });

        await InventoryTransaction.create(
          [
            {
              inventoryItem: inventoryItem._id,

              transactionType: "stock_out",

              quantity,

              previousQuantity,

              newQuantity,

              unitCost: Number(inventoryItem.unitCost || 0),

              referenceType: "feeding",

              referenceId: feeding._id,

              notes: `Feed consumed by ${pond.name}.`,
            },
          ],
          {
            session,
          },
        );

        remainingFeed = newQuantity;
        inventoryUpdated = true;
      } else {
        remainingFeed = null;
        inventoryUpdated = false;
      }

      feeding.date = data.date || feeding.date;
      feeding.pond = pond._id;
      feeding.feedBrand = data.feedBrand;
      feeding.feedType = data.feedType;
      feeding.feedSize = data.feedSize;
      feeding.feedSizeUnit = data.feedSizeUnit || "mm";
      feeding.quantityUsed = quantity;
      feeding.quantityUnit = data.quantityUnit || "kg";
      feeding.feedingTime = data.feedingTime;
      feeding.cost = Number(data.cost || 0);
      feeding.estimatedBiomassBeforeFeeding =
        data.estimatedBiomassBeforeFeeding ?? null;
      feeding.notes = data.notes || "";

      await feeding.save({ session });

      await ActivityLog.create(
        [
          {
            action: "update",

            entityType: "FeedingRecord",

            entityId: feeding._id,

            description: `Feeding record for pond "${pond.name}" was updated.`,

            metadata: {
              pondId: feeding.pond,

              quantityUsed: quantity,

              quantityUnit: feeding.quantityUnit,

              feedBrand: feeding.feedBrand,

              feedType: feeding.feedType,

              inventoryUpdated,
            },

            ipAddress: ipAddress || "",

            userAgent: userAgent || "",
          },
        ],
        {
          session,
        },
      );

      updatedFeedingId = feeding._id;
    });

    const updatedFeeding = await FeedingRecord.findById(updatedFeedingId)
      .populate("pond", "name pondNumber status")
      .lean();

    return {
      success: true,

      feeding: {
        ...updatedFeeding,
        inventoryUpdated,
      },

      remainingFeed,

      inventoryUpdated,
    };
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return {
        success: false,
        reason: "NOT_FOUND",
      };
    }

    if (error.code === "INSUFFICIENT_FEED") {
      return {
        success: false,
        reason: "INSUFFICIENT_FEED",
        available: error.available,
      };
    }

    if (error.code === "FEED_UNIT_MISMATCH") {
      return {
        success: false,
        reason: "FEED_UNIT_MISMATCH",
        inventoryUnit: error.inventoryUnit,
        feedingUnit: error.feedingUnit,
      };
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Delete a feeding record, restoring any feed quantity it
 * had previously deducted from inventory.
 */
const deleteFeeding = async ({ id, ipAddress, userAgent }) => {
  if (!mongoose.isValidObjectId(id)) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const session = await mongoose.startSession();

  try {
    let deletedFeeding = null;

    await session.withTransaction(async () => {
      const feeding = await FeedingRecord.findById(id).session(session);

      if (!feeding) {
        const error = new Error("Feeding record not found.");

        error.code = "NOT_FOUND";

        throw error;
      }

      await reverseFeedingInventory({
        feedingId: feeding._id,
        session,
      });

      deletedFeeding = {
        _id: feeding._id,
        pond: feeding.pond,
        feedBrand: feeding.feedBrand,
        quantityUsed: feeding.quantityUsed,
        quantityUnit: feeding.quantityUnit,
      };

      await FeedingRecord.deleteOne({ _id: feeding._id }).session(session);

      await ActivityLog.create(
        [
          {
            action: "delete",

            entityType: "FeedingRecord",

            entityId: feeding._id,

            description: `Feeding record of ${feeding.quantityUsed} ${feeding.quantityUnit} was deleted.`,

            metadata: {
              pondId: feeding.pond,

              quantityUsed: feeding.quantityUsed,

              quantityUnit: feeding.quantityUnit,

              feedBrand: feeding.feedBrand,
            },

            ipAddress: ipAddress || "",

            userAgent: userAgent || "",
          },
        ],
        {
          session,
        },
      );
    });

    return {
      success: true,

      feeding: deletedFeeding,
    };
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return {
        success: false,
        reason: "NOT_FOUND",
      };
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * List feeding records.
 */
const listFeedings = async ({ pond, from, to, page = 1, limit = 30 }) => {
  const currentPage = Math.max(Number(page) || 1, 1);

  const pageSize = Math.min(Math.max(Number(limit) || 30, 1), 100);

  const filter = {};

  if (pond) {
    filter.pond = pond;
  }

  if (from || to) {
    filter.date = {};

    if (from) {
      filter.date.$gte = dateStart(from);
    }

    if (to) {
      filter.date.$lte = dateEnd(to);
    }
  }

  const [records, total, consumption] = await Promise.all([
    FeedingRecord.find(filter)
      .populate("pond", "name pondNumber status")
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    FeedingRecord.countDocuments(filter),

    FeedingRecord.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,

          totalQuantity: {
            $sum: "$quantityUsed",
          },

          totalCost: {
            $sum: "$cost",
          },
        },
      },
    ]),
  ]);

  return {
    records,

    summary: {
      totalQuantity: consumption[0]?.totalQuantity || 0,

      totalCost: consumption[0]?.totalCost || 0,
    },

    pagination: {
      page: currentPage,

      limit: pageSize,

      total,

      pages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * Get one feeding record by ID.
 */
const getFeedingById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return FeedingRecord.findById(id)
    .populate("pond", "name pondNumber status currentFishCount")
    .lean();
};

/**
 * Get today's total feed consumption.
 */
const getTodayConsumption = async () => {
  const start = dateStart(new Date());

  const end = dateEnd(new Date());

  const result = await FeedingRecord.aggregate([
    {
      $match: {
        date: {
          $gte: start,
          $lte: end,
        },
      },
    },

    {
      $group: {
        _id: null,

        quantity: {
          $sum: "$quantityUsed",
        },

        cost: {
          $sum: "$cost",
        },
      },
    },
  ]);

  return {
    quantity: result[0]?.quantity || 0,

    cost: result[0]?.cost || 0,
  };
};

module.exports = {
  createFeeding,
  updateFeeding,
  deleteFeeding,
  listFeedings,
  getFeedingById,
  getTodayConsumption,
};
