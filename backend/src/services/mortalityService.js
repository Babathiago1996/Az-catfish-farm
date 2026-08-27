const mongoose = require("mongoose");

const Mortality = require("../models/Mortality");
const Pond = require("../models/Pond");
const Stocking = require("../models/Stocking");
const ActivityLog = require("../models/ActivityLog");

const {
  uploadImageBuffer,
  deleteCloudinaryImage,
} = require("../utils/cloudinaryUpload");

const { notifyMortalityCreated } = require("./notificationAutomationService");

/*
 * ============================================================
 * HELPERS
 * ============================================================
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
 * Normalize the images returned to the frontend.
 *
 * This guarantees that every mortality record has:
 *
 * images: [
 *   { url: "...", publicId: "..." },
 *   ...
 * ]
 *
 * (up to 5 entries), built from the new `images` array
 * field, or falling back to the legacy single `image`
 * field for records created before multi-image support.
 *
 * `image` is kept on the response too (mirrors images[0])
 * so any older frontend code relying on it keeps working.
 */
const normalizeMortalityRecord = (record) => {
  if (!record) {
    return record;
  }

  const normalized = {
    ...record,
  };

  let images = Array.isArray(record.images) ? record.images : [];

  images = images
    .map((image) => ({
      url: image?.url || image?.secure_url || image?.secureUrl || "",
      publicId: image?.publicId || image?.public_id || "",
    }))
    .filter((image) => image.url);

  /*
   * Fall back to the legacy single `image` field only
   * when there are no entries in `images`.
   */
  if (!images.length) {
    const legacyUrl =
      record.image?.url ||
      record.image?.secure_url ||
      record.image?.secureUrl ||
      "";

    const legacyPublicId =
      record.image?.publicId || record.image?.public_id || "";

    if (legacyUrl) {
      images = [
        {
          url: legacyUrl,
          publicId: legacyPublicId,
        },
      ];
    }
  }

  images = images.slice(0, 5);

  normalized.images = images;

  normalized.image = images[0] || null;

  return normalized;
};

/*
 * ============================================================
 * STOCK / POND CALCULATIONS
 * ============================================================
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

const calculateAvailableFish = async (pondId, excludeMortalityId = null) => {
  const totalStocked = await getTotalStockedForPond(pondId);

  const totalMortality = await getMortalityTotalForPond(
    pondId,
    excludeMortalityId,
  );

  return Math.max(totalStocked - totalMortality, 0);
};

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

  return Object.keys(dateFilter).length ? dateFilter : null;
};

/*
 * ============================================================
 * CLOUDINARY
 * ============================================================
 */

const uploadMortalityImage = async (file) => {
  if (!file) {
    return null;
  }

  return uploadImageBuffer(file.buffer, {
    folder: "az-fish-farm/mortality",
  });
};

/*
 * Upload up to 5 image files to Cloudinary.
 *
 * Returns an array of { url, publicId }.
 *
 * If any upload fails partway through, everything that
 * was already uploaded in this batch is cleaned up before
 * the error is re-thrown, so we never leave orphaned
 * Cloudinary assets behind.
 */
const uploadMortalityImages = async (files) => {
  if (!files || !files.length) {
    return [];
  }

  const limitedFiles = files.slice(0, 5);

  /*
   * Upload every image concurrently instead of one at a
   * time. Uploading 5 images sequentially (each taking a
   * few seconds) could easily add up to 15-20+ seconds,
   * which is enough to trip the frontend's request timeout
   * even though the backend was still working fine.
   * Running them in parallel brings the total wait time
   * down to roughly the slowest single upload instead of
   * the sum of all of them.
   */
  const settled = await Promise.allSettled(
    limitedFiles.map((file) => uploadMortalityImage(file)),
  );

  const uploaded = settled
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value);

  const failure = settled.find((result) => result.status === "rejected");

  if (failure) {
    /*
     * At least one upload failed. Clean up anything that
     * did succeed so we don't leave orphaned images sitting
     * in Cloudinary, then surface the original error.
     */
    await Promise.all(
      uploaded.map((image) =>
        image?.publicId
          ? deleteCloudinaryImage(image.publicId).catch(() => null)
          : null,
      ),
    );

    throw failure.reason;
  }

  return uploaded;
};

/*
 * ============================================================
 * CREATE
 * ============================================================
 */

const createMortality = async ({ data, files, ipAddress, userAgent }) => {
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

  let uploadedImages = [];

  try {
    if (files && files.length) {
      uploadedImages = await uploadMortalityImages(files);
    }

    const mortalityData = {
      date,
      pond: pond._id,
      quantity,
      estimatedCause: data.estimatedCause || "unknown",
      notes: data.notes || "",
    };

    if (uploadedImages.length) {
      mortalityData.images = uploadedImages.map((image) => ({
        url: image.url,
        publicId: image.publicId || "",
      }));
    }

    const record = await Mortality.create(mortalityData);

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
        imageCount: Array.isArray(record.images) ? record.images.length : 0,
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

    const normalizedRecord = normalizeMortalityRecord(populatedRecord);

    try {
      await notifyMortalityCreated({
        mortality: normalizedRecord,
      });
    } catch (notificationError) {
      console.error("Mortality notification failed:", notificationError);
    }

    return {
      success: true,
      record: normalizedRecord,
      pond: updatedPond,
    };
  } catch (error) {
    if (uploadedImages.length) {
      await Promise.all(
        uploadedImages.map((image) =>
          image?.publicId
            ? deleteCloudinaryImage(image.publicId).catch((cleanupError) => {
                console.error("Cloudinary cleanup failed:", cleanupError);
              })
            : null,
        ),
      );
    }

    throw error;
  }
};

/*
 * ============================================================
 * LIST
 * ============================================================
 */

const listMortality = async ({ pond, from, to, page = 1, limit = 30 }) => {
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

  const [rawRecords, total] = await Promise.all([
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

  const records = rawRecords.map((record) => normalizeMortalityRecord(record));

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
 * ============================================================
 * GET ONE
 * ============================================================
 */

const getMortalityById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  const record = await Mortality.findById(id)
    .populate(
      "pond",
      "name pondNumber pondType pondSize stockingDate currentFishCount currentAverageWeight waterSource status",
    )
    .lean();

  return normalizeMortalityRecord(record);
};

/*
 * ============================================================
 * UPDATE
 * ============================================================
 */

const updateMortality = async ({
  id,
  data,
  files,
  removeImage = false,
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

  const newPondId = data.pond !== undefined ? String(data.pond) : oldPondId;

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

  const excludeId = newPondId === oldPondId ? record._id : null;

  const availableFish = await calculateAvailableFish(newPondId, excludeId);

  if (newQuantity > availableFish) {
    return {
      success: false,
      reason: "QUANTITY_EXCEEDS_STOCK",
    };
  }

  let uploadedImages = [];

  try {
    if (files && files.length) {
      uploadedImages = await uploadMortalityImages(files);
    }

    /*
     * Collect every publicId currently on the record
     * (new `images` array, plus the legacy single
     * `image` field for older records) so we know what
     * to clean up in Cloudinary if it's being replaced
     * or removed.
     */
    const oldPublicIds = [
      ...(Array.isArray(record.images)
        ? record.images.map((image) => image?.publicId).filter(Boolean)
        : []),
      record.image?.publicId,
    ].filter(Boolean);

    record.date = newDate;
    record.pond = newPondId;
    record.quantity = newQuantity;

    if (data.estimatedCause !== undefined) {
      record.estimatedCause = data.estimatedCause || "unknown";
    }

    if (data.notes !== undefined) {
      record.notes = data.notes || "";
    }

    if (uploadedImages.length) {
      record.images = uploadedImages.map((image) => ({
        url: image.url,
        publicId: image.publicId || "",
      }));

      record.image = undefined;
    } else if (removeImage) {
      record.images = [];
      record.image = undefined;
    }

    await record.save();

    const pondsToUpdate =
      oldPondId === newPondId ? [newPondId] : [oldPondId, newPondId];

    for (const pondId of pondsToUpdate) {
      await recalculatePondFishCount(pondId);
    }

    if (oldPublicIds.length && (uploadedImages.length || removeImage)) {
      await Promise.all(
        oldPublicIds.map((publicId) =>
          deleteCloudinaryImage(publicId).catch((cloudinaryError) => {
            console.error(
              "Unable to delete old Cloudinary image:",
              cloudinaryError,
            );
          }),
        ),
      );
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
        imageCount: Array.isArray(record.images) ? record.images.length : 0,
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
      record: normalizeMortalityRecord(updatedRecord),
    };
  } catch (error) {
    if (uploadedImages.length) {
      await Promise.all(
        uploadedImages.map((image) =>
          image?.publicId
            ? deleteCloudinaryImage(image.publicId).catch((cleanupError) => {
                console.error(
                  "Cloudinary replacement cleanup failed:",
                  cleanupError,
                );
              })
            : null,
        ),
      );
    }

    throw error;
  }
};

/*
 * ============================================================
 * DELETE
 * ============================================================
 *
 * This is a genuine hard delete — the record is fully
 * removed from MongoDB, not soft-deleted or flagged inactive.
 *
 * Uses the same recalculatePondFishCount() helper that
 * create/update already rely on, so removing a mortality
 * record correctly gives those fish back to the pond's
 * currentFishCount (recomputed from scratch as
 * totalStocked - totalMortality, exactly as it already
 * works elsewhere in this file) without needing separate
 * manual delta math.
 */

const deleteMortality = async ({ id, ipAddress, userAgent }) => {
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

  const pondId = record.pond;

  /*
   * Collect every Cloudinary publicId on this record —
   * the new `images` array, plus the legacy single `image`
   * field for records created before multi-image support —
   * so nothing gets left behind as an orphaned asset.
   */
  const publicIds = [
    ...(Array.isArray(record.images)
      ? record.images.map((image) => image?.publicId).filter(Boolean)
      : []),
    record.image?.publicId,
  ].filter(Boolean);

  const deletedInfo = {
    _id: record._id,
    pond: record.pond,
    date: record.date,
    quantity: record.quantity,
    estimatedCause: record.estimatedCause,
  };

  await Mortality.deleteOne({ _id: record._id });

  const updatedPond = await recalculatePondFishCount(pondId);

  if (publicIds.length) {
    await Promise.all(
      publicIds.map((publicId) =>
        deleteCloudinaryImage(publicId).catch((cleanupError) => {
          console.error(
            "Unable to delete mortality image on record deletion:",
            cleanupError,
          );
        }),
      ),
    );
  }

  await ActivityLog.create({
    action: "delete",
    entityType: "Mortality",
    entityId: deletedInfo._id,

    description: `Mortality record of ${deletedInfo.quantity} fish was permanently deleted.`,

    metadata: {
      pondId: deletedInfo.pond,
      quantity: deletedInfo.quantity,
      estimatedCause: deletedInfo.estimatedCause,
      date: deletedInfo.date,
      remainingFish: updatedPond?.currentFishCount || 0,
    },

    ipAddress: ipAddress || "",
    userAgent: userAgent || "",
  });

  return {
    success: true,
    record: deletedInfo,
    pond: updatedPond,
  };
};

/*
 * ============================================================
 * SUMMARY
 * ============================================================
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
    totalMortality: Number(aggregate[0]?.totalMortality || 0),

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
  deleteMortality,
  getMortalitySummary,

  recalculatePondFishCount,
  getMortalityTotalForPond,
  getTotalStockedForPond,
  calculateAvailableFish,
};