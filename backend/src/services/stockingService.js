const mongoose = require("mongoose");

const Stocking = require("../models/Stocking");
const Pond = require("../models/Pond");
const ActivityLog = require("../models/ActivityLog");

const {
  notifyStockingCreated,
} = require("../services/notificationAutomationService");

/*
|--------------------------------------------------------------------------
| Create Stocking
|--------------------------------------------------------------------------
*/

const createStocking = async ({ data, ipAddress, userAgent }) => {
  if (!data.pond || !mongoose.isValidObjectId(data.pond)) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  const quantity = Number(data.fingerlingQuantity);

  const cost = Number(data.cost);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      success: false,
      reason: "INVALID_QUANTITY",
    };
  }

  if (!Number.isFinite(cost) || cost < 0) {
    return {
      success: false,
      reason: "INVALID_COST",
    };
  }

  const session = await mongoose.startSession();

  let createdStockingId = null;

  try {
    await session.withTransaction(async () => {
      const pond = await Pond.findById(data.pond).session(session);

      if (!pond) {
        const error = new Error("The selected pond was not found.");

        error.code = "POND_NOT_FOUND";

        throw error;
      }

      if (pond.status === "maintenance") {
        const error = new Error(
          "Stocking cannot be performed while the pond is under maintenance.",
        );

        error.code = "POND_MAINTENANCE";

        throw error;
      }

      const [createdStocking] = await Stocking.create(
        [
          {
            stockingDate: data.stockingDate,

            pond: pond._id,

            fingerlingQuantity: quantity,

            fingerlingSize: data.fingerlingSize,

            fingerlingSizeUnit: data.fingerlingSizeUnit || "cm",

            supplier: data.supplier || "",

            cost,

            expectedHarvestDate: data.expectedHarvestDate || null,

            initialWeight: Number(data.initialWeight) || 0,

            notes: data.notes || "",
          },
        ],
        {
          session,
        },
      );

      /*
       * Update pond stock inside
       * the same transaction.
       */
      pond.currentFishCount = Number(pond.currentFishCount || 0) + quantity;

      pond.stockingDate = data.stockingDate;

      pond.status = "active";

      await pond.save({
        session,
      });

      /*
       * Activity log belongs to
       * the same transaction.
       */
      await ActivityLog.create(
        [
          {
            action: "stocking",

            entityType: "Stocking",

            entityId: createdStocking._id,

            description: `Stocking of ${quantity} fingerlings was recorded for pond "${pond.name || pond.pondName || pond.pondNumber || pond._id}".`,

            metadata: {
              pondId: pond._id,

              quantity,

              cost,

              supplier: createdStocking.supplier,

              stockingDate: createdStocking.stockingDate,
            },

            ipAddress: ipAddress || "",

            userAgent: userAgent || "",
          },
        ],
        {
          session,
        },
      );

      createdStockingId = createdStocking._id;
    });

    /*
     * Retrieve the committed record.
     */
    const createdStocking = await Stocking.findById(createdStockingId)
      .populate(
        "pond",
        "name pondName pondNumber pondType pondSize status currentFishCount currentAverageWeight",
      )
      .lean();

    /*
     * Notification happens only
     * after transaction succeeds.
     */
    try {
      await notifyStockingCreated({
        stocking: createdStocking,
      });
    } catch (notificationError) {
      console.error("Stocking notification failed:", notificationError.message);
    }

    const updatedPond = await Pond.findById(data.pond).lean();

    return {
      success: true,

      stocking: createdStocking,

      pond: updatedPond,
    };
  } catch (error) {
    if (error.code === "POND_NOT_FOUND") {
      return {
        success: false,
        reason: "POND_NOT_FOUND",
      };
    }

    if (error.code === "POND_MAINTENANCE") {
      return {
        success: false,
        reason: "POND_MAINTENANCE",
      };
    }

    if (error.code === "INVALID_QUANTITY") {
      return {
        success: false,
        reason: "INVALID_QUANTITY",
      };
    }

    if (error.code === "INVALID_COST") {
      return {
        success: false,
        reason: "INVALID_COST",
      };
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| List Stocking
|--------------------------------------------------------------------------
*/

const listStocking = async ({ pond, from, to, page = 1, limit = 20 }) => {
  const currentPage = Math.max(Number(page) || 1, 1);

  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const filter = {};

  if (pond) {
    filter.pond = pond;
  }

  if (from || to) {
    filter.stockingDate = {};

    if (from) {
      const start = new Date(from);

      if (!Number.isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);

        filter.stockingDate.$gte = start;
      }
    }

    if (to) {
      const end = new Date(to);

      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);

        filter.stockingDate.$lte = end;
      }
    }
  }

  const [records, total] = await Promise.all([
    Stocking.find(filter)
      .populate("pond", "name pondName pondNumber status")
      .sort({
        stockingDate: -1,
        createdAt: -1,
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Stocking.countDocuments(filter),
  ]);

  return {
    records,

    pagination: {
      page: currentPage,

      limit: pageSize,

      total,

      pages: Math.ceil(total / pageSize),
    },
  };
};

/*
|--------------------------------------------------------------------------
| Get Stocking
|--------------------------------------------------------------------------
*/

const getStockingById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return Stocking.findById(id)
    .populate("pond", "name pondName pondNumber status currentFishCount")
    .lean();
};

module.exports = {
  createStocking,
  listStocking,
  getStockingById,
};
