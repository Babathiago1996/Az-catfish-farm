const mongoose = require("mongoose");

const Mortality = require("../models/Mortality");
const Pond = require("../models/Pond");
const Stocking = require("../models/Stocking");
const ActivityLog = require("../models/ActivityLog");
const {
  notifyMortalityCreated,
} = require("../services/notificationAutomationService");

/**
 * Normalize a value to the beginning of its calendar day.
 */
const startOfDay = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

/**
 * Normalize a value to the end of its calendar day.
 */
const endOfDay = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(23, 59, 59, 999);

  return date;
};

/**
 * Get total number of fish stocked into a pond.
 */
const getTotalStockedForPond = async (pondId) => {
  if (!mongoose.isValidObjectId(pondId)) {
    return 0;
  }

  const result = await Stocking.aggregate([
    {
      $match: {
        pond: new mongoose.Types.ObjectId(pondId),
      },
    },
    {
      $group: {
        _id: null,
        totalStocked: {
          $sum: "$fingerlingQuantity",
        },
      },
    },
  ]);

  return Number(result[0]?.totalStocked || 0);
};

/**
 * Get total mortality recorded for a pond.
 */
const getMortalityTotalForPond = async (pondId, excludeId = null) => {
  if (!mongoose.isValidObjectId(pondId)) {
    return 0;
  }

  const match = {
    pond: new mongoose.Types.ObjectId(pondId),
  };

  if (excludeId && mongoose.isValidObjectId(excludeId)) {
    match._id = {
      $ne: new mongoose.Types.ObjectId(excludeId),
    };
  }

  const result = await Mortality.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$quantity",
        },
      },
    },
  ]);

  return Number(result[0]?.total || 0);
};

/**
 * Calculate the current available fish count for a pond.
 *
 * available fish =
 * total stocked - total mortality
 */
const calculateAvailableFish = async (
  pondId,
  excludeMortalityId = null,
) => {
  const totalStocked = await getTotalStockedForPond(pondId);

  const totalMortality = await getMortalityTotalForPond(
    pondId,
    excludeMortalityId,
  );

  return Math.max(totalStocked - totalMortality, 0);
};

/**
 * Recalculate and synchronize Pond.currentFishCount.
 */
const recalculatePondFishCount = async (pondId) => {
  if (!mongoose.isValidObjectId(pondId)) {
    return null;
  }

  const pond = await Pond.findById(pondId);

  if (!pond) {
    return null;
  }

  const currentFishCount = await calculateAvailableFish(pondId);

  pond.currentFishCount = currentFishCount;

  await pond.save();

  return pond;
};

/**
 * Build date filters safely.
 */
const buildDateFilter = ({ from, to }) => {
  if (!from && !to) {
    return null;
  }

  const dateFilter = {};

  if (from) {
    const startDate = startOfDay(from);

    if (startDate) {
      dateFilter.$gte = startDate;
    }
  }

  if (to) {
    const endDate = endOfDay(to);

    if (endDate) {
      dateFilter.$lte = endDate;
    }
  }

  return Object.keys(dateFilter).length > 0 ? dateFilter : null;
};

/**
 * Create a mortality record.
 */
const createMortality = async ({ data, ipAddress, userAgent }) => {
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

  const date = startOfDay(data.date);

  if (!date) {
    return {
      success: false,
      reason: "INVALID_DATE",
    };
  }

  const quantity = Number(data.quantity);

  if (!Number.isInteger(quantity) || quantity < 1) {
    return {
      success: false,
      reason: "INVALID_QUANTITY",
    };
  }

  const availableFish = await calculateAvailableFish(data.pond);

  if (quantity > availableFish) {
    return {
      success: false,
      reason: "QUANTITY_EXCEEDS_STOCK",
    };
  }

  const record = await Mortality.create({
    date,
    pond: pond._id,
    quantity,
    estimatedCause: data.estimatedCause || "unknown",
    notes: data.notes || "",
    image: {
      url: data.imageUrl || "",
      publicId: data.imagePublicId || "",
    },
  });

  /**
   * Synchronize the pond after creating mortality.
   */
  const updatedPond = await recalculatePondFishCount(pond._id);

  await ActivityLog.create({
    action: "create",
    entityType: "Mortality",
    entityId: record._id,
    description: `${record.quantity} fish mortality was recorded.`,
    metadata: {
      pondId: record.pond,
      quantity: record.quantity,
      estimatedCause: record.estimatedCause,
      remainingFish: updatedPond?.currentFishCount || 0,
    },
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });

  const populatedRecord = await Mortality.findById(record._id)
    .populate(
      "pond",
      "name pondNumber pondType pondSize stockingDate currentFishCount currentAverageWeight waterSource status",
    )
    .lean();

  await notifyMortalityCreated({
    mortality: populatedRecord,
  });

  return {
    success: true,
    record: populatedRecord,
    pond: updatedPond,
  };
};

/**
 * List mortality records.
 */
const listMortality = async ({
  pond,
  from,
  to,
  page = 1,
  limit = 30,
}) => {
  const currentPage = Math.max(Number(page) || 1, 1);

  const pageSize = Math.min(Math.max(Number(limit) || 30, 1), 100);

  const filter = {};

  if (pond) {
    filter.pond = pond;
  }

  const dateFilter = buildDateFilter({
    from,
    to,
  });

  if (dateFilter) {
    filter.date = dateFilter;
  }

  const [records, total] = await Promise.all([
    Mortality.find(filter)
      .populate(
        "pond",
        "name pondNumber pondType pondSize stockingDate currentFishCount currentAverageWeight waterSource status",
      )
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Mortality.countDocuments(filter),
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

/**
 * Get one mortality record by ID.
 */
const getMortalityById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return Mortality.findById(id)
    .populate(
      "pond",
      "name pondNumber pondType pondSize stockingDate currentFishCount currentAverageWeight waterSource status",
    )
    .lean();
};

/**
 * Update a mortality record.
 */
const updateMortality = async ({
  id,
  data,
  ipAddress,
  userAgent,
}) => {
  if (!mongoose.isValidObjectId(id)) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const record = await Mortality.findById(id);

  if (!record) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const oldPondId = String(record.pond);

  const newPondId =
    data.pond !== undefined ? String(data.pond) : oldPondId;

  if (!mongoose.isValidObjectId(newPondId)) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  const targetPond = await Pond.findById(newPondId);

  if (!targetPond) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  let newDate = record.date;

  if (data.date !== undefined) {
    newDate = startOfDay(data.date);

    if (!newDate) {
      return {
        success: false,
        reason: "INVALID_DATE",
      };
    }
  }

  let newQuantity = Number(record.quantity);

  if (data.quantity !== undefined) {
    newQuantity = Number(data.quantity);

    if (!Number.isInteger(newQuantity) || newQuantity < 1) {
      return {
        success: false,
        reason: "INVALID_QUANTITY",
      };
    }
  }

  const excludeId =
    newPondId === oldPondId ? record._id : null;

  const availableFish = await calculateAvailableFish(
    newPondId,
    excludeId,
  );

  if (newQuantity > availableFish) {
    return {
      success: false,
      reason: "QUANTITY_EXCEEDS_STOCK",
    };
  }

  record.date = newDate;
  record.pond = newPondId;
  record.quantity = newQuantity;

  if (data.estimatedCause !== undefined) {
    record.estimatedCause = data.estimatedCause || "unknown";
  }

  if (data.notes !== undefined) {
    record.notes = data.notes || "";
  }

  if (data.imageUrl !== undefined) {
    record.image.url = data.imageUrl || "";
  }

  if (data.imagePublicId !== undefined) {
    record.image.publicId = data.imagePublicId || "";
  }

  await record.save();

  const pondsToUpdate =
    oldPondId === newPondId
      ? [newPondId]
      : [oldPondId, newPondId];

  for (const pondId of pondsToUpdate) {
    await recalculatePondFishCount(pondId);
  }

  await ActivityLog.create({
    action: "update",
    entityType: "Mortality",
    entityId: record._id,
    description: "Mortality record was updated.",
    metadata: {
      pondId: record.pond,
      quantity: record.quantity,
      estimatedCause: record.estimatedCause,
      date: record.date,
      imageUpdated:
        data.imageUrl !== undefined ||
        data.imagePublicId !== undefined,
    },
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });

  const updatedRecord = await Mortality.findById(record._id)
    .populate(
      "pond",
      "name pondNumber pondType pondSize stockingDate currentFishCount currentAverageWeight waterSource status",
    )
    .lean();

  return {
    success: true,
    record: updatedRecord,
  };
};

/**
 * Get mortality summary.
 */
const getMortalitySummary = async ({ pond, from, to }) => {
  const filter = {};

  if (pond) {
    filter.pond = pond;
  }

  const dateFilter = buildDateFilter({
    from,
    to,
  });

  if (dateFilter) {
    filter.date = dateFilter;
  }

  const [aggregate, byPond, byCause] = await Promise.all([
    Mortality.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,
          totalMortality: {
            $sum: "$quantity",
          },
          records: {
            $sum: 1,
          },
        },
      },
    ]),

    Mortality.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: "$pond",
          quantity: {
            $sum: "$quantity",
          },
          records: {
            $sum: 1,
          },
        },
      },
      {
        $lookup: {
          from: "ponds",
          localField: "_id",
          foreignField: "_id",
          as: "pond",
        },
      },
      {
        $unwind: {
          path: "$pond",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          pondId: "$_id",
          pondName: "$pond.name",
          pondNumber: "$pond.pondNumber",
          quantity: 1,
          records: 1,
          currentFishCount: "$pond.currentFishCount",
        },
      },
      {
        $sort: {
          quantity: -1,
        },
      },
    ]),

    Mortality.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: {
            $cond: [
              {
                $or: [
                  {
                    $eq: [
                      {
                        $ifNull: ["$estimatedCause", ""],
                      },
                      "",
                    ],
                  },
                  {
                    $eq: ["$estimatedCause", null],
                  },
                ],
              },
              "unknown",
              "$estimatedCause",
            ],
          },
          quantity: {
            $sum: "$quantity",
          },
          records: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          cause: "$_id",
          quantity: 1,
          records: 1,
        },
      },
      {
        $sort: {
          quantity: -1,
        },
      },
    ]),
  ]);

  return {
    totalMortality: Number(
      aggregate[0]?.totalMortality || 0,
    ),

    records: Number(aggregate[0]?.records || 0),

    byPond,

    byCause,
  };
};

module.exports = {
  createMortality,
  listMortality,
  getMortalityById,
  updateMortality,
  getMortalitySummary,
  recalculatePondFishCount,
  getMortalityTotalForPond,
  getTotalStockedForPond,
  calculateAvailableFish,
};