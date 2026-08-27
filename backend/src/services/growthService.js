const mongoose = require("mongoose");

const GrowthRecord = require("../models/GrowthRecord");
const Pond = require("../models/Pond");
const ActivityLog = require("../models/ActivityLog");

/**
 * Convert a value into the beginning of its calendar day.
 *
 * Growth records are intentionally normalized to midnight
 * so the unique { pond, date } index represents one record
 * per pond per calendar day.
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
 * Convert a value into the end of its calendar day.
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
 * Calculate biomass.
 *
 * Average fish weight is stored in grams.
 * Fish count is the number of fish in the pond.
 * Biomass is stored in kilograms.
 *
 * Formula:
 *
 * biomass (kg) =
 * average weight (g) × fish count / 1000
 */
const calculateBiomass = (averageWeight, fishCount) => {
  const weight = Number(averageWeight);
  const count = Number(fishCount);

  if (!Number.isFinite(weight) || weight < 0) {
    return 0;
  }

  if (!Number.isFinite(count) || count < 0) {
    return 0;
  }

  return Number(((weight * count) / 1000).toFixed(3));
};

/**
 * Calculate percentage growth between
 * the previous and current average weight.
 *
 * Formula:
 *
 * ((current - previous) / previous) × 100
 */
const calculateGrowthRate = (currentWeight, previousWeight) => {
  const current = Number(currentWeight);
  const previous = Number(previousWeight);

  if (!Number.isFinite(current) || current < 0) {
    return 0;
  }

  if (!Number.isFinite(previous) || previous <= 0) {
    return 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
};

/**
 * Find the growth record immediately before
 * a specified date for a particular pond.
 */
const findPreviousRecord = async ({ pond, date, excludeId = null }) => {
  const filter = {
    pond,
    date: {
      $lt: date,
    },
  };

  if (excludeId) {
    filter._id = {
      $ne: excludeId,
    };
  }

  return GrowthRecord.findOne(filter)
    .sort({
      date: -1,
      createdAt: -1,
    })
    .lean();
};

/**
 * Find the latest growth record for a pond.
 */
const findLatestRecord = async (pondId) => {
  return GrowthRecord.findOne({
    pond: pondId,
  })
    .sort({
      date: -1,
      createdAt: -1,
    })
    .lean();
};

/**
 * Populate pond information consistently
 * throughout the growth service.
 */
const populatePond = (query) => {
  return query.populate(
    "pond",
    "name pondNumber pondType pondSize stockingDate currentFishCount currentAverageWeight waterSource status",
  );
};

/**
 * Synchronize the pond's current average weight
 * with its latest growth record.
 *
 * If the pond has no growth records, the value
 * is reset to zero.
 */
const synchronizePondAverageWeight = async (pondId) => {
  if (!mongoose.isValidObjectId(pondId)) {
    return;
  }

  const latestRecord = await findLatestRecord(pondId);

  await Pond.findByIdAndUpdate(
    pondId,
    {
      currentAverageWeight: latestRecord
        ? Number(latestRecord.averageWeight)
        : 0,
    },
    {
      runValidators: true,
    },
  );
};

/**
 * Recalculate all growth records for a pond.
 *
 * This is important when an older growth record
 * is edited because all subsequent records can
 * have their growth rate and previous average
 * weight affected.
 */
const recalculatePondGrowthRecords = async (pondId) => {
  if (!mongoose.isValidObjectId(pondId)) {
    return [];
  }

  const pond = await Pond.findById(pondId);

  if (!pond) {
    return [];
  }

  const records = await GrowthRecord.find({
    pond: pondId,
  }).sort({
    date: 1,
    createdAt: 1,
  });

  let previousWeight = null;

  for (const record of records) {
    const currentWeight = Number(record.averageWeight);

    record.biomass = calculateBiomass(currentWeight, pond.currentFishCount);

    record.previousAverageWeight =
      previousWeight === null ? null : previousWeight;

    record.growthRate =
      previousWeight === null
        ? 0
        : calculateGrowthRate(currentWeight, previousWeight);

    await record.save();

    previousWeight = currentWeight;
  }

  await synchronizePondAverageWeight(pondId);

  return records;
};

/**
 * Create a new growth record.
 */
const createGrowthRecord = async ({ data, ipAddress, userAgent }) => {
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

  /**
   * IMPORTANT:
   * The GrowthRecord model uses "date".
   * Not "recordDate".
   */
  const date = startOfDay(data.date);

  if (!date) {
    return {
      success: false,
      reason: "INVALID_DATE",
    };
  }

  /**
   * Because dates are normalized to midnight,
   * the unique { pond, date } index now correctly
   * prevents multiple records on the same day.
   */
  const duplicate = await GrowthRecord.findOne({
    pond: pond._id,
    date,
  });

  if (duplicate) {
    return {
      success: false,
      reason: "DUPLICATE_DATE",
    };
  }

  const averageWeight = Number(data.averageWeight);
  const sampleSize = Number(data.sampleSize);

  if (!Number.isFinite(averageWeight) || averageWeight <= 0) {
    return {
      success: false,
      reason: "INVALID_AVERAGE_WEIGHT",
    };
  }

  if (!Number.isFinite(sampleSize) || sampleSize < 1) {
    return {
      success: false,
      reason: "INVALID_SAMPLE_SIZE",
    };
  }

  /**
   * Find the previous growth record.
   */
  const previousRecord = await findPreviousRecord({
    pond: pond._id,
    date,
  });

  const previousAverageWeight = previousRecord
    ? Number(previousRecord.averageWeight)
    : null;

  const calculatedBiomass = calculateBiomass(
    averageWeight,
    pond.currentFishCount,
  );

  const calculatedGrowthRate =
    previousAverageWeight === null
      ? 0
      : calculateGrowthRate(averageWeight, previousAverageWeight);

  try {
    const record = await GrowthRecord.create({
      date,
      pond: pond._id,
      averageWeight,
      sampleSize,
      biomass: calculatedBiomass,
      growthRate: calculatedGrowthRate,
      previousAverageWeight,
      notes: data.notes || "",
    });

    /**
     * Keep the pond's current average weight
     * synchronized with the latest growth record.
     */
    await synchronizePondAverageWeight(pond._id);

    await ActivityLog.create({
      action: "create",
      entityType: "GrowthRecord",
      entityId: record._id,
      description: "Fish-growth record was created.",
      metadata: {
        pondId: record.pond,
        date: record.date,
        averageWeight: record.averageWeight,
        sampleSize: record.sampleSize,
        biomass: record.biomass,
        growthRate: record.growthRate,
        previousAverageWeight: record.previousAverageWeight,
      },
      ipAddress: ipAddress || "",
      userAgent: userAgent || "",
    });

    return {
      success: true,
      record,
    };
  } catch (error) {
    /**
     * Handle MongoDB unique-index race conditions.
     */
    if (error?.code === 11000) {
      return {
        success: false,
        reason: "DUPLICATE_DATE",
      };
    }

    throw error;
  }
};

/**
 * List growth records with pagination
 * and optional date/pond filters.
 */
const listGrowthRecords = async ({ pond, from, to, page = 1, limit = 30 }) => {
  const currentPage = Math.max(Number(page) || 1, 1);

  const pageSize = Math.min(Math.max(Number(limit) || 30, 1), 100);

  const filter = {};

  if (pond) {
    filter.pond = pond;
  }

  if (from || to) {
    filter.date = {};

    if (from) {
      const startDate = startOfDay(from);

      if (startDate) {
        filter.date.$gte = startDate;
      }
    }

    if (to) {
      const endDate = endOfDay(to);

      if (endDate) {
        filter.date.$lte = endDate;
      }
    }
  }

  const [records, total] = await Promise.all([
    populatePond(
      GrowthRecord.find(filter)
        .sort({
          date: -1,
          createdAt: -1,
        })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ),

    GrowthRecord.countDocuments(filter),
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
 * Get one growth record by ID.
 */
const getGrowthRecordById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return populatePond(GrowthRecord.findById(id)).lean();
};

/**
 * Update an existing growth record.
 */
const updateGrowthRecord = async ({ id, data, ipAddress, userAgent }) => {
  if (!mongoose.isValidObjectId(id)) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const record = await GrowthRecord.findById(id);

  if (!record) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  /**
   * Keep the original pond unless a new pond
   * was explicitly supplied.
   */
  const oldPondId = record.pond;

  const pondId = data.pond !== undefined ? data.pond : record.pond;

  if (!mongoose.isValidObjectId(pondId)) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  const pond = await Pond.findById(pondId);

  if (!pond) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  /**
   * The model uses "date", not "recordDate".
   */
  const date =
    data.date !== undefined ? startOfDay(data.date) : startOfDay(record.date);

  if (!date) {
    return {
      success: false,
      reason: "INVALID_DATE",
    };
  }

  /**
   * Prevent another growth record from using
   * the same pond and calendar date.
   */
  const duplicate = await GrowthRecord.findOne({
    _id: {
      $ne: record._id,
    },
    pond: pondId,
    date,
  });

  if (duplicate) {
    return {
      success: false,
      reason: "DUPLICATE_DATE",
    };
  }

  if (data.averageWeight !== undefined) {
    const averageWeight = Number(data.averageWeight);

    if (!Number.isFinite(averageWeight) || averageWeight <= 0) {
      return {
        success: false,
        reason: "INVALID_AVERAGE_WEIGHT",
      };
    }

    record.averageWeight = averageWeight;
  }

  if (data.sampleSize !== undefined) {
    const sampleSize = Number(data.sampleSize);

    if (!Number.isFinite(sampleSize) || sampleSize < 1) {
      return {
        success: false,
        reason: "INVALID_SAMPLE_SIZE",
      };
    }

    record.sampleSize = sampleSize;
  }

  if (data.notes !== undefined) {
    record.notes = data.notes;
  }

  record.pond = pondId;
  record.date = date;

  /**
   * Recalculate the record's own values first.
   */
  const previousRecord = await findPreviousRecord({
    pond: pondId,
    date,
    excludeId: record._id,
  });

  record.previousAverageWeight = previousRecord
    ? Number(previousRecord.averageWeight)
    : null;

  record.biomass = calculateBiomass(
    record.averageWeight,
    pond.currentFishCount,
  );

  record.growthRate =
    record.previousAverageWeight === null
      ? 0
      : calculateGrowthRate(record.averageWeight, record.previousAverageWeight);

  try {
    await record.save();
  } catch (error) {
    if (error?.code === 11000) {
      return {
        success: false,
        reason: "DUPLICATE_DATE",
      };
    }

    throw error;
  }

  /**
   * Recalculate the new pond because moving
   * or changing a historical record can affect
   * subsequent growth records.
   */
  await recalculatePondGrowthRecords(pondId);

  /**
   * If the record was moved from one pond
   * to another, recalculate the old pond too.
   */
  if (String(oldPondId) !== String(pondId)) {
    await recalculatePondGrowthRecords(oldPondId);
  }

  /**
   * Make sure both ponds have their current
   * average weights synchronized.
   */
  await synchronizePondAverageWeight(pondId);

  if (String(oldPondId) !== String(pondId)) {
    await synchronizePondAverageWeight(oldPondId);
  }

  const updatedRecord = await populatePond(
    GrowthRecord.findById(record._id),
  ).lean();

  await ActivityLog.create({
    action: "update",
    entityType: "GrowthRecord",
    entityId: record._id,
    description: "Fish-growth record was updated.",
    metadata: {
      pondId: record.pond,
      date: record.date,
      averageWeight: record.averageWeight,
      sampleSize: record.sampleSize,
      biomass: record.biomass,
      growthRate: record.growthRate,
      previousAverageWeight: record.previousAverageWeight,
    },
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });

  return {
    success: true,
    record: updatedRecord,
  };
};

/**
 * Permanently delete a growth record.
 *
 * This is a hard delete — the document is fully removed
 * from MongoDB, there is no soft-delete flag on this model.
 *
 * Because removing a record from the middle of a pond's
 * growth timeline changes which record is "previous" for
 * everything that comes after it, this reuses the same
 * recalculatePondGrowthRecords cascade that updateGrowthRecord
 * already relies on, so growthRate/previousAverageWeight stay
 * correct for every remaining record, and the pond's
 * currentAverageWeight is re-synced to whatever the new
 * latest record is (or reset to 0 if none remain).
 */
const deleteGrowthRecord = async ({ id, ipAddress, userAgent }) => {
  if (!mongoose.isValidObjectId(id)) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const record = await GrowthRecord.findById(id);

  if (!record) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const pondId = record.pond;

  const deletedInfo = {
    _id: record._id,
    pond: record.pond,
    date: record.date,
    averageWeight: record.averageWeight,
    sampleSize: record.sampleSize,
  };

  await GrowthRecord.deleteOne({ _id: record._id });

  /*
   * Recompute growthRate/previousAverageWeight for every
   * record that comes after the deleted one, and resync
   * the pond's currentAverageWeight to the new latest
   * record (or 0 if the pond has no growth records left).
   */
  await recalculatePondGrowthRecords(pondId);

  await ActivityLog.create({
    action: "delete",
    entityType: "GrowthRecord",
    entityId: deletedInfo._id,
    description: "Fish-growth record was permanently deleted.",
    metadata: {
      pondId: deletedInfo.pond,
      date: deletedInfo.date,
      averageWeight: deletedInfo.averageWeight,
      sampleSize: deletedInfo.sampleSize,
    },
    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });

  return {
    success: true,
    record: deletedInfo,
  };
};

/**
 * Get growth analytics.
 */
const getGrowthAnalytics = async ({ pond, from, to, limit = 100 }) => {
  const filter = {};

  if (pond) {
    filter.pond = pond;
  }

  if (from || to) {
    filter.date = {};

    if (from) {
      const startDate = startOfDay(from);

      if (startDate) {
        filter.date.$gte = startDate;
      }
    }

    if (to) {
      const endDate = endOfDay(to);

      if (endDate) {
        filter.date.$lte = endDate;
      }
    }
  }

  const pageLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);

  const records = await populatePond(
    GrowthRecord.find(filter)
      .sort({
        date: 1,
        createdAt: 1,
      })
      .limit(pageLimit)
      .lean(),
  );

  const chartData = records.map((record) => ({
    id: record._id,
    date: record.date,
    pondId: record.pond?._id || null,
    pondName: record.pond?.name || "Unknown Pond",
    averageWeight: Number(record.averageWeight || 0),
    sampleSize: Number(record.sampleSize || 0),
    biomass: Number(record.biomass || 0),
    growthRate: Number(record.growthRate || 0),
    previousAverageWeight:
      record.previousAverageWeight === null
        ? null
        : Number(record.previousAverageWeight),
  }));

  /**
   * Because chartData is sorted ascending,
   * the final record encountered for each pond
   * is that pond's latest record within the
   * selected analytics range.
   */
  const latestByPond = new Map();

  chartData.forEach((record) => {
    if (record.pondId) {
      latestByPond.set(String(record.pondId), record);
    }
  });

  const summary = Array.from(latestByPond.values()).map((record) => ({
    pondId: record.pondId,
    pondName: record.pondName,
    latestAverageWeight: record.averageWeight,
    latestBiomass: record.biomass,
    latestGrowthRate: record.growthRate,
    date: record.date,
  }));

  return {
    chartData,
    summary,
    totalRecords: chartData.length,
  };
};

module.exports = {
  createGrowthRecord,
  listGrowthRecords,
  getGrowthRecordById,
  updateGrowthRecord,
  deleteGrowthRecord,
  getGrowthAnalytics,
  calculateBiomass,
  calculateGrowthRate,
  recalculatePondGrowthRecords,
};