const mongoose = require("mongoose");

const Sale = require("../models/Sale");
const Pond = require("../models/Pond");
const ActivityLog = require("../models/ActivityLog");

const generateInvoiceNumber = require("../utils/invoiceNumber");
const {
  notifySaleCreated,
} = require("../services/notificationAutomationService");

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

const startOfDay = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(23, 59, 59, 999);

  return date;
};

/*
|--------------------------------------------------------------------------
| Calculation Helpers
|--------------------------------------------------------------------------
*/

/*
 * averageWeight is assumed to be in grams.
 *
 * Example:
 * 100 fish × 500g = 50,000g = 50kg
 */
const calculateTotalWeight = (quantitySold, averageWeight) => {
  const quantity = Number(quantitySold);
  const weight = Number(averageWeight);

  if (!Number.isFinite(quantity) || !Number.isFinite(weight)) {
    return 0;
  }

  if (quantity <= 0 || weight <= 0) {
    return 0;
  }

  return Number(((quantity * weight) / 1000).toFixed(3));
};

const calculateTotalAmount = (
  quantitySold,
  averageWeight,
  pricePerKilogram,
) => {
  const totalWeightKg = calculateTotalWeight(quantitySold, averageWeight);

  const price = Number(pricePerKilogram);

  if (!Number.isFinite(price) || price < 0) {
    return 0;
  }

  return Number((totalWeightKg * price).toFixed(2));
};

const calculateBalanceDue = (totalAmount, amountPaid, paymentStatus) => {
  if (paymentStatus === "cancelled") {
    return 0;
  }

  const total = Number(totalAmount) || 0;
  const paid = Number(amountPaid) || 0;

  return Number(Math.max(total - paid, 0).toFixed(2));
};

const normalizePaymentStatus = ({ paymentStatus, amountPaid, totalAmount }) => {
  if (paymentStatus === "cancelled") {
    return "cancelled";
  }

  const paid = Number(amountPaid) || 0;
  const total = Number(totalAmount) || 0;

  if (paid <= 0) {
    return "pending";
  }

  if (paid >= total) {
    return "paid";
  }

  return "partial";
};

/*
|--------------------------------------------------------------------------
| Pond Helpers
|--------------------------------------------------------------------------
*/

const getPond = async (pondId, session = null) => {
  if (!pondId || !mongoose.isValidObjectId(pondId)) {
    return null;
  }

  const query = Pond.findById(pondId);

  if (session) {
    query.session(session);
  }

  return query;
};

const deductPondStock = async ({ pondId, quantity, session }) => {
  const safeQuantity = Number(quantity);

  if (
    !mongoose.isValidObjectId(pondId) ||
    !Number.isFinite(safeQuantity) ||
    safeQuantity <= 0
  ) {
    return {
      success: false,
      reason: "INVALID_QUANTITY",
    };
  }

  const pond = await Pond.findOneAndUpdate(
    {
      _id: pondId,
      currentFishCount: {
        $gte: safeQuantity,
      },
    },
    {
      $inc: {
        currentFishCount: -safeQuantity,
      },
    },
    {
      new: true,
      session,
    },
  );

  if (pond) {
    return {
      success: true,
      pond,
    };
  }

  const existingPond = await getPond(pondId, session);

  if (!existingPond) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  return {
    success: false,
    reason: "QUANTITY_EXCEEDS_STOCK",
  };
};

const restorePondStock = async ({ pondId, quantity, session }) => {
  const safeQuantity = Number(quantity);

  if (
    !mongoose.isValidObjectId(pondId) ||
    !Number.isFinite(safeQuantity) ||
    safeQuantity <= 0
  ) {
    return null;
  }

  return Pond.findOneAndUpdate(
    {
      _id: pondId,
    },
    {
      $inc: {
        currentFishCount: safeQuantity,
      },
    },
    {
      new: true,
      session,
    },
  );
};

/*
|--------------------------------------------------------------------------
| Create Sale
|--------------------------------------------------------------------------
*/

const createSale = async ({ data, ipAddress, userAgent }) => {
  const session = await mongoose.startSession();

  let createdSaleId = null;

  try {
    await session.withTransaction(async () => {
      const pond = await getPond(data.pond, session);

      if (!pond) {
        const error = new Error("The selected pond was not found.");

        error.code = "POND_NOT_FOUND";

        throw error;
      }

      const quantitySold = Number(data.quantitySold);

      const averageWeight = Number(data.averageWeight);

      const pricePerKilogram = Number(data.pricePerKilogram);

      if (!Number.isFinite(quantitySold) || quantitySold <= 0) {
        const error = new Error("Quantity sold must be greater than zero.");

        error.code = "INVALID_QUANTITY";

        throw error;
      }

      if (!Number.isFinite(averageWeight) || averageWeight <= 0) {
        const error = new Error(
          "Average fish weight must be greater than zero.",
        );

        error.code = "INVALID_AVERAGE_WEIGHT";

        throw error;
      }

      if (!Number.isFinite(pricePerKilogram) || pricePerKilogram < 0) {
        const error = new Error("Price per kilogram cannot be negative.");

        error.code = "INVALID_PRICE";
        throw error;
      }

      const totalWeight = calculateTotalWeight(quantitySold, averageWeight);

      const totalAmount = calculateTotalAmount(
        quantitySold,
        averageWeight,
        pricePerKilogram,
      );

      const amountPaid = Number(data.amountPaid) || 0;

      if (amountPaid < 0) {
        const error = new Error("Amount paid cannot be negative.");

        error.code = "INVALID_AMOUNT_PAID";

        throw error;
      }

      if (amountPaid > totalAmount) {
        const error = new Error(
          "Amount paid cannot exceed the total sale amount.",
        );

        error.code = "PAYMENT_EXCEEDS_TOTAL";

        throw error;
      }

      const paymentStatus = normalizePaymentStatus({
        paymentStatus: data.paymentStatus,
        amountPaid,
        totalAmount,
      });

      /*
       * A cancelled sale cannot have
       * money recorded against it.
       */
      if (paymentStatus === "cancelled" && amountPaid > 0) {
        const error = new Error(
          "A sale with payment received cannot be cancelled until the payment is handled.",
        );

        error.code = "CANNOT_CANCEL_PAID_SALE";

        throw error;
      }

      const balanceDue = calculateBalanceDue(
        totalAmount,
        amountPaid,
        paymentStatus,
      );

      /*
       * Active sales consume fish.
       */
      if (paymentStatus !== "cancelled") {
        const stockResult = await deductPondStock({
          pondId: data.pond,
          quantity: quantitySold,
          session,
        });

        if (!stockResult.success) {
          const error = new Error(stockResult.reason);

          error.code = stockResult.reason;

          throw error;
        }
      }

      const invoiceNumber = await generateInvoiceNumber();

      const [sale] = await Sale.create(
        [
          {
            invoiceNumber,

            saleDate: data.saleDate || new Date(),

            pond: data.pond,

            customerName: data.customerName,

            phoneNumber: data.phoneNumber || "",

            quantitySold,

            averageWeight,

            totalWeight,

            pricePerKilogram,

            totalAmount,

            paymentStatus,

            amountPaid,

            balanceDue,

            paymentMethod: data.paymentMethod || "cash",

            notes: data.notes || "",
          },
        ],
        {
          session,
        },
      );

      await ActivityLog.create(
        [
          {
            action: "create",

            entityType: "Sale",

            entityId: sale._id,

            description: `Sale ${sale.invoiceNumber} was recorded.`,

            metadata: {
              invoiceNumber: sale.invoiceNumber,

              customerName: sale.customerName,

              pondId: sale.pond,

              quantitySold: sale.quantitySold,

              totalWeight: sale.totalWeight,

              totalAmount: sale.totalAmount,

              amountPaid: sale.amountPaid,

              balanceDue: sale.balanceDue,

              paymentStatus: sale.paymentStatus,

              paymentMethod: sale.paymentMethod,
            },

            ipAddress: ipAddress || "",

            userAgent: userAgent || "",
          },
        ],
        {
          session,
        },
      );

      createdSaleId = sale._id;
    });

    /*
     * Transaction has successfully
     * committed at this point.
     */
    const populatedSale = await Sale.findById(createdSaleId)
      .populate(
        "pond",
        "name pondName pondNumber pondType pondSize currentFishCount currentAverageWeight waterSource status",
      )
      .lean();

    /*
     * Notifications are deliberately
     * outside the transaction.
     *
     * Notification failure must not
     * undo a successful sale.
     */
    try {
      await notifySaleCreated({
        sale: populatedSale,
      });
    } catch (notificationError) {
      console.error("Sale notification failed:", notificationError.message);
    }

    return {
      success: true,
      sale: populatedSale,
    };
  } catch (error) {
    if (error.code === "POND_NOT_FOUND") {
      return {
        success: false,
        reason: "POND_NOT_FOUND",
      };
    }

    if (error.code === "QUANTITY_EXCEEDS_STOCK") {
      return {
        success: false,
        reason: "QUANTITY_EXCEEDS_STOCK",
      };
    }

    if (error.code === "PAYMENT_EXCEEDS_TOTAL") {
      return {
        success: false,
        reason: "PAYMENT_EXCEEDS_TOTAL",
      };
    }

    if (error.code === "CANNOT_CANCEL_PAID_SALE") {
      return {
        success: false,
        reason: "CANNOT_CANCEL_PAID_SALE",
      };
    }

    if (error.code === "INVALID_QUANTITY") {
      return {
        success: false,
        reason: "INVALID_QUANTITY",
      };
    }

    if (error.code === "INVALID_AVERAGE_WEIGHT") {
      return {
        success: false,
        reason: "INVALID_AVERAGE_WEIGHT",
      };
    }

    if (error.code === "INVALID_PRICE") {
      return {
        success: false,
        reason: "INVALID_PRICE",
      };
    }

    if (error.code === "INVALID_AMOUNT_PAID") {
      return {
        success: false,
        reason: "INVALID_AMOUNT_PAID",
      };
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| List Sales
|--------------------------------------------------------------------------
*/

const listSales = async ({
  pond,
  paymentStatus,
  from,
  to,
  search,
  page = 1,
  limit = 30,
}) => {
  const currentPage = Math.max(Number(page) || 1, 1);

  const pageSize = Math.min(Math.max(Number(limit) || 30, 1), 100);

  const filter = {};

  if (pond) {
    filter.pond = pond;
  }

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  if (from || to) {
    filter.saleDate = {};

    if (from) {
      const start = startOfDay(from);

      if (start) {
        filter.saleDate.$gte = start;
      }
    }

    if (to) {
      const end = endOfDay(to);

      if (end) {
        filter.saleDate.$lte = end;
      }
    }
  }

  if (search) {
    const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filter.$or = [
      {
        customerName: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        phoneNumber: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        invoiceNumber: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
    ];
  }

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate(
        "pond",
        "name pondName pondNumber pondType pondSize currentFishCount currentAverageWeight waterSource status",
      )
      .sort({
        saleDate: -1,
        createdAt: -1,
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Sale.countDocuments(filter),
  ]);

  return {
    sales,

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
| Get Sale
|--------------------------------------------------------------------------
*/

const getSaleById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return Sale.findById(id)
    .populate(
      "pond",
      "name pondName pondNumber pondType pondSize currentFishCount currentAverageWeight waterSource status",
    )
    .lean();
};

/*
|--------------------------------------------------------------------------
| Update Sale
|--------------------------------------------------------------------------
*/

const updateSale = async ({ id, data, ipAddress, userAgent }) => {
  if (!mongoose.isValidObjectId(id)) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const session = await mongoose.startSession();

  try {
    let updatedSale = null;

    await session.withTransaction(async () => {
      const sale = await Sale.findById(id).session(session);

      if (!sale) {
        const error = new Error("Sale not found.");

        error.code = "NOT_FOUND";

        throw error;
      }

      const originalPondId = String(sale.pond);

      const originalQuantity = Number(sale.quantitySold);

      const originalStatus = sale.paymentStatus;

      const nextPondId =
        data.pond !== undefined ? String(data.pond) : originalPondId;

      const nextQuantity =
        data.quantitySold !== undefined
          ? Number(data.quantitySold)
          : originalQuantity;

      const nextWeight =
        data.averageWeight !== undefined
          ? Number(data.averageWeight)
          : Number(sale.averageWeight);

      const nextPrice =
        data.pricePerKilogram !== undefined
          ? Number(data.pricePerKilogram)
          : Number(sale.pricePerKilogram);

      if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
        const error = new Error("Quantity sold must be greater than zero.");

        error.code = "INVALID_QUANTITY";

        throw error;
      }

      if (!Number.isFinite(nextWeight) || nextWeight <= 0) {
        const error = new Error(
          "Average fish weight must be greater than zero.",
        );

        error.code = "INVALID_AVERAGE_WEIGHT";

        throw error;
      }

      if (!Number.isFinite(nextPrice) || nextPrice < 0) {
        const error = new Error("Price per kilogram cannot be negative.");

        error.code = "INVALID_PRICE";

        throw error;
      }

      if (!mongoose.isValidObjectId(nextPondId)) {
        const error = new Error("The selected pond was not found.");

        error.code = "POND_NOT_FOUND";

        throw error;
      }

      const nextTotalWeight = calculateTotalWeight(nextQuantity, nextWeight);

      const nextTotalAmount = calculateTotalAmount(
        nextQuantity,
        nextWeight,
        nextPrice,
      );

      const nextAmountPaid =
        data.amountPaid !== undefined
          ? Number(data.amountPaid)
          : Number(sale.amountPaid || 0);

      if (!Number.isFinite(nextAmountPaid) || nextAmountPaid < 0) {
        const error = new Error("Amount paid cannot be negative.");

        error.code = "INVALID_AMOUNT_PAID";

        throw error;
      }

      if (nextAmountPaid > nextTotalAmount) {
        const error = new Error(
          "Amount paid cannot exceed the updated sale amount.",
        );

        error.code = "PAYMENT_EXCEEDS_TOTAL";

        throw error;
      }

      const nextStatus = normalizePaymentStatus({
        paymentStatus:
          data.paymentStatus !== undefined
            ? data.paymentStatus
            : originalStatus,

        amountPaid: nextAmountPaid,

        totalAmount: nextTotalAmount,
      });

      if (nextStatus === "cancelled" && nextAmountPaid > 0) {
        const error = new Error(
          "A sale with payment received cannot be cancelled until the payment is handled.",
        );

        error.code = "CANNOT_CANCEL_PAID_SALE";

        throw error;
      }

      const nextBalanceDue = calculateBalanceDue(
        nextTotalAmount,
        nextAmountPaid,
        nextStatus,
      );

      const oldActive = originalStatus !== "cancelled";

      const newActive = nextStatus !== "cancelled";

      /*
       * Restore original stock first.
       *
       * The transaction guarantees
       * rollback if anything below fails.
       */
      if (oldActive && originalQuantity > 0) {
        const restoredPond = await restorePondStock({
          pondId: originalPondId,

          quantity: originalQuantity,

          session,
        });

        if (!restoredPond) {
          const error = new Error("The original pond was not found.");

          error.code = "POND_NOT_FOUND";

          throw error;
        }
      }

      /*
       * Ensure the new pond exists.
       */
      const nextPond = await getPond(nextPondId, session);

      if (!nextPond) {
        const error = new Error("The selected pond was not found.");

        error.code = "POND_NOT_FOUND";

        throw error;
      }

      /*
       * Deduct the new quantity
       * if the updated sale remains active.
       */
      if (newActive && nextQuantity > 0) {
        const stockResult = await deductPondStock({
          pondId: nextPondId,

          quantity: nextQuantity,

          session,
        });

        if (!stockResult.success) {
          const error = new Error(stockResult.reason);

          error.code = stockResult.reason;

          throw error;
        }
      }

      if (data.customerName !== undefined) {
        sale.customerName = data.customerName;
      }

      if (data.phoneNumber !== undefined) {
        sale.phoneNumber = data.phoneNumber;
      }

      sale.pond = nextPondId;

      sale.quantitySold = nextQuantity;

      sale.averageWeight = nextWeight;

      sale.totalWeight = nextTotalWeight;

      sale.pricePerKilogram = nextPrice;

      sale.totalAmount = nextTotalAmount;

      sale.amountPaid = nextAmountPaid;

      sale.balanceDue = nextBalanceDue;

      sale.paymentStatus = nextStatus;

      if (data.paymentMethod !== undefined) {
        sale.paymentMethod = data.paymentMethod;
      }

      if (data.saleDate !== undefined) {
        sale.saleDate = data.saleDate;
      }

      if (data.notes !== undefined) {
        sale.notes = data.notes;
      }

      await sale.save({
        session,
      });

      await ActivityLog.create(
        [
          {
            action: "update",

            entityType: "Sale",

            entityId: sale._id,

            description: `Sale ${sale.invoiceNumber} was updated.`,

            metadata: {
              invoiceNumber: sale.invoiceNumber,

              pondId: sale.pond,

              quantitySold: sale.quantitySold,

              totalWeight: sale.totalWeight,

              totalAmount: sale.totalAmount,

              amountPaid: sale.amountPaid,

              balanceDue: sale.balanceDue,

              paymentStatus: sale.paymentStatus,

              paymentMethod: sale.paymentMethod,
            },

            ipAddress: ipAddress || "",

            userAgent: userAgent || "",
          },
        ],
        {
          session,
        },
      );

      updatedSale = await Sale.findById(sale._id)
        .populate(
          "pond",
          "name pondName pondNumber pondType pondSize currentFishCount currentAverageWeight waterSource status",
        )
        .session(session)
        .lean();
    });

    return {
      success: true,
      sale: updatedSale,
    };
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return {
        success: false,
        reason: "NOT_FOUND",
      };
    }

    if (error.code === "POND_NOT_FOUND") {
      return {
        success: false,
        reason: "POND_NOT_FOUND",
      };
    }

    if (error.code === "QUANTITY_EXCEEDS_STOCK") {
      return {
        success: false,
        reason: "QUANTITY_EXCEEDS_STOCK",
      };
    }

    if (error.code === "PAYMENT_EXCEEDS_TOTAL") {
      return {
        success: false,
        reason: "PAYMENT_EXCEEDS_TOTAL",
      };
    }

    if (error.code === "CANNOT_CANCEL_PAID_SALE") {
      return {
        success: false,
        reason: "CANNOT_CANCEL_PAID_SALE",
      };
    }

    if (error.code === "INVALID_QUANTITY") {
      return {
        success: false,
        reason: "INVALID_QUANTITY",
      };
    }

    if (error.code === "INVALID_AVERAGE_WEIGHT") {
      return {
        success: false,
        reason: "INVALID_AVERAGE_WEIGHT",
      };
    }

    if (error.code === "INVALID_PRICE") {
      return {
        success: false,
        reason: "INVALID_PRICE",
      };
    }

    if (error.code === "INVALID_AMOUNT_PAID") {
      return {
        success: false,
        reason: "INVALID_AMOUNT_PAID",
      };
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| Delete Sale
|--------------------------------------------------------------------------
*/
/*
|--------------------------------------------------------------------------
| Delete Sale
|--------------------------------------------------------------------------
*/

const deleteSale = async ({ id, ipAddress, userAgent }) => {
  if (!mongoose.isValidObjectId(id)) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const session = await mongoose.startSession();

  try {
    let deletedSale = null;

    await session.withTransaction(async () => {
      const sale = await Sale.findById(id).session(session);

      if (!sale) {
        const error = new Error("Sale not found.");

        error.code = "NOT_FOUND";

        throw error;
      }

      /*
       * A cancelled sale never held any fish
       * against the pond, so there is nothing
       * to give back. Every other status does.
       */
      if (sale.paymentStatus !== "cancelled") {
        await restorePondStock({
          pondId: sale.pond,
          quantity: sale.quantitySold,
          session,
        });
      }

      deletedSale = {
        _id: sale._id,
        invoiceNumber: sale.invoiceNumber,
        pond: sale.pond,
        quantitySold: sale.quantitySold,
        totalAmount: sale.totalAmount,
        amountPaid: sale.amountPaid,
        paymentStatus: sale.paymentStatus,
      };

      await Sale.deleteOne({ _id: sale._id }).session(session);

      await ActivityLog.create(
        [
          {
            action: "delete",

            entityType: "Sale",

            entityId: sale._id,

            description: `Sale ${sale.invoiceNumber} was deleted.`,

            metadata: {
              invoiceNumber: sale.invoiceNumber,
              pondId: sale.pond,
              quantitySold: sale.quantitySold,
              totalAmount: sale.totalAmount,
              amountPaid: sale.amountPaid,
              paymentStatus: sale.paymentStatus,
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
      sale: deletedSale,
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
/*
|--------------------------------------------------------------------------
| Sales Summary
|--------------------------------------------------------------------------
*/

const getSalesSummary = async ({ from, to, pond }) => {
  const filter = {
    paymentStatus: {
      $ne: "cancelled",
    },
  };

  if (pond) {
    filter.pond = pond;
  }

  if (from || to) {
    filter.saleDate = {};

    if (from) {
      const start = startOfDay(from);

      if (start) {
        filter.saleDate.$gte = start;
      }
    }

    if (to) {
      const end = endOfDay(to);

      if (end) {
        filter.saleDate.$lte = end;
      }
    }
  }

  const [summary, byDay, byPaymentStatus] = await Promise.all([
    Sale.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: null,

          totalSales: {
            $sum: 1,
          },

          totalFishSold: {
            $sum: "$quantitySold",
          },

          totalWeightKg: {
            $sum: "$totalWeight",
          },

          totalRevenue: {
            $sum: "$totalAmount",
          },

          totalCollected: {
            $sum: "$amountPaid",
          },

          totalOutstanding: {
            $sum: "$balanceDue",
          },
        },
      },
    ]),

    Sale.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$saleDate",
            },
          },

          revenue: {
            $sum: "$totalAmount",
          },

          collected: {
            $sum: "$amountPaid",
          },

          outstanding: {
            $sum: "$balanceDue",
          },

          fishSold: {
            $sum: "$quantitySold",
          },

          weightKg: {
            $sum: "$totalWeight",
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },

      {
        $project: {
          _id: 0,

          date: "$_id",

          revenue: 1,

          collected: 1,

          outstanding: 1,

          fishSold: 1,

          weightKg: 1,
        },
      },
    ]),

    Sale.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: "$paymentStatus",

          count: {
            $sum: 1,
          },

          amount: {
            $sum: "$totalAmount",
          },

          collected: {
            $sum: "$amountPaid",
          },

          outstanding: {
            $sum: "$balanceDue",
          },
        },
      },

      {
        $project: {
          _id: 0,

          status: "$_id",

          count: 1,

          amount: 1,

          collected: 1,

          outstanding: 1,
        },
      },

      {
        $sort: {
          status: 1,
        },
      },
    ]),
  ]);

  const totals = summary[0] || {};

  return {
    totals: {
      totalSales: totals.totalSales || 0,

      totalFishSold: totals.totalFishSold || 0,

      totalWeightKg: Number((totals.totalWeightKg || 0).toFixed(3)),

      totalRevenue: Number((totals.totalRevenue || 0).toFixed(2)),

      totalCollected: Number((totals.totalCollected || 0).toFixed(2)),

      totalOutstanding: Number((totals.totalOutstanding || 0).toFixed(2)),
    },

    byDay,

    byPaymentStatus,
  };
};

module.exports = {
  createSale,
  listSales,
  getSaleById,
  updateSale,
  deleteSale,
  getSalesSummary,
  calculateTotalAmount,
  calculateTotalWeight,
};
