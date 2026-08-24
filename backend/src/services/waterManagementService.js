const mongoose = require("mongoose");

const WaterManagement = require("../models/WaterManagement");
const Pond = require("../models/Pond");
const ActivityLog = require("../models/ActivityLog");

const {
  notifyWaterRecordCreated,
} = require("../services/notificationAutomationService");

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

const dateStart = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

const dateEnd = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(23, 59, 59, 999);

  return date;
};

/*
|--------------------------------------------------------------------------
| Water Change Status
|--------------------------------------------------------------------------
*/

const getWaterChangeStatus = (nextWaterChange) => {
  if (!nextWaterChange) {
    return "unknown";
  }

  const today = dateStart(new Date());
  const nextDate = dateStart(nextWaterChange);

  if (!today || !nextDate) {
    return "unknown";
  }

  if (nextDate < today) {
    return "overdue";
  }

  if (nextDate.getTime() === today.getTime()) {
    return "due";
  }

  return "upcoming";
};

/*
|--------------------------------------------------------------------------
| Pond Validation
|--------------------------------------------------------------------------
*/

const validatePond = async (
  pondId,
  session = null,
) => {
  if (
    !pondId ||
    !mongoose.isValidObjectId(pondId)
  ) {
    return false;
  }

  const query = Pond.exists({
    _id: pondId,
  });

  if (session) {
    query.session(session);
  }

  return Boolean(await query);
};

/*
|--------------------------------------------------------------------------
| Population
|--------------------------------------------------------------------------
*/

const populateRecord = (query) =>
  query.populate(
    "pond",
    "name pondName pondNumber pondType pondSize status currentFishCount",
  );

/*
|--------------------------------------------------------------------------
| Build Create Data
|--------------------------------------------------------------------------
*/

const buildCreateData = (data) => {
  const recordData = {
    pond: data.pond,

    nextWaterChange:
      data.nextWaterChange ?? null,

    waterCondition:
      data.waterCondition ?? "normal",

    waterLevel:
      data.waterLevel ?? "normal",

    pumpStatus:
      data.pumpStatus ?? "working",

    electricityStatus:
      data.electricityStatus ?? "available",

    waterChangeNotes:
      data.waterChangeNotes ?? "",
  };

  /*
   * lastWaterChange is accepted only when explicitly supplied.
   *
   * Normally the frontend does not send it when creating
   * the initial water-management record.
   */
  if (data.lastWaterChange !== undefined) {
    recordData.lastWaterChange =
      data.lastWaterChange;
  }

  return recordData;
};

/*
|--------------------------------------------------------------------------
| Create / Upsert Water Management
|--------------------------------------------------------------------------
|
| There is one record per pond.
|
| If the pond already has a record, this operation updates
| the operational fields without accidentally resetting
| lastWaterChange.
|
*/

const createWaterManagement = async ({
  data,
  ipAddress,
  userAgent,
}) => {
  if (!(await validatePond(data.pond))) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  const session = await mongoose.startSession();

  let created = false;
  let recordId = null;

  try {
    await session.withTransaction(async () => {
      /*
       * Confirm pond still exists inside transaction.
       */
      const pondExists = await validatePond(
        data.pond,
        session,
      );

      if (!pondExists) {
        const error = new Error(
          "The selected pond was not found.",
        );

        error.code = "POND_NOT_FOUND";

        throw error;
      }

      const existing =
        await WaterManagement.findOne({
          pond: data.pond,
        }).session(session);

      if (existing) {
        /*
         * Do NOT replace the entire document.
         *
         * This prevents an initial create form from
         * accidentally erasing lastWaterChange.
         */
        const fields = [
          "nextWaterChange",
          "waterCondition",
          "waterLevel",
          "pumpStatus",
          "electricityStatus",
          "waterChangeNotes",
        ];

        fields.forEach((field) => {
          if (data[field] !== undefined) {
            existing[field] = data[field];
          }
        });

        if (data.lastWaterChange !== undefined) {
          existing.lastWaterChange =
            data.lastWaterChange;
        }

        const record = await existing.save({
          session,
        });

        recordId = record._id;
        created = false;

        await ActivityLog.create(
          [
            {
              action: "update",

              entityType:
                "WaterManagement",

              entityId: record._id,

              description:
                "Water-management information was updated.",

              metadata: {
                pondId: record.pond,

                nextWaterChange:
                  record.nextWaterChange,

                waterCondition:
                  record.waterCondition,

                waterLevel:
                  record.waterLevel,

                pumpStatus:
                  record.pumpStatus,

                electricityStatus:
                  record.electricityStatus,
              },

              ipAddress:
                ipAddress || "",

              userAgent:
                userAgent || "",
            },
          ],
          {
            session,
          },
        );

        return;
      }

      /*
       * New record.
       */
      const recordData =
        buildCreateData(data);

      const records =
        await WaterManagement.create(
          [recordData],
          {
            session,
          },
        );

      const record = records[0];

      recordId = record._id;
      created = true;

      await ActivityLog.create(
        [
          {
            action: "create",

            entityType:
              "WaterManagement",

            entityId: record._id,

            description:
              "Water-management information was recorded.",

            metadata: {
              pondId: record.pond,

              nextWaterChange:
                record.nextWaterChange,

              waterCondition:
                record.waterCondition,

              waterLevel:
                record.waterLevel,

              pumpStatus:
                record.pumpStatus,

              electricityStatus:
                record.electricityStatus,
            },

            ipAddress:
              ipAddress || "",

            userAgent:
              userAgent || "",
          },
        ],
        {
          session,
        },
      );
    });

    const savedRecord =
      await populateRecord(
        WaterManagement.findById(recordId),
      ).lean();

    if (!savedRecord) {
      throw new Error(
        "Water-management record could not be retrieved after saving.",
      );
    }

    /*
     * Notification is only for a genuinely new record.
     */
    if (created) {
      try {
        await notifyWaterRecordCreated({
          water: savedRecord,
          record: savedRecord,
        });
      } catch (notificationError) {
        console.error(
          "Water-management notification failed:",
          notificationError.message,
        );
      }
    }

    return {
      success: true,
      record: savedRecord,
      created,
    };
  } catch (error) {
    if (error.code === "POND_NOT_FOUND") {
      return {
        success: false,
        reason: "POND_NOT_FOUND",
      };
    }

    /*
     * A unique pond constraint can theoretically be hit
     * by two simultaneous requests.
     */
    if (error.code === 11000) {
      return {
        success: false,
        reason: "DUPLICATE_RECORD",
      };
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| List Water Management
|--------------------------------------------------------------------------
*/

const listWaterManagement = async ({
  pond,
  status,
  from,
  to,
  page = 1,
  limit = 30,
}) => {
  const currentPage = Math.max(
    Number(page) || 1,
    1,
  );

  const pageSize = Math.min(
    Math.max(Number(limit) || 30, 1),
    100,
  );

  const filter = {};

  if (pond) {
    filter.pond = pond;
  }

  /*
   * Date range filtering applies to next scheduled
   * water change.
   */
  if (from || to) {
    filter.nextWaterChange = {};

    if (from) {
      const start = dateStart(from);

      if (start) {
        filter.nextWaterChange.$gte = start;
      }
    }

    if (to) {
      const end = dateEnd(to);

      if (end) {
        filter.nextWaterChange.$lte = end;
      }
    }
  }

  const todayStart = dateStart(new Date());
  const todayEnd = dateEnd(new Date());

  if (status === "overdue") {
    filter.nextWaterChange = {
      ...(filter.nextWaterChange || {}),
      $lt: todayStart,
    };
  }

  if (status === "due") {
    filter.nextWaterChange = {
      ...(filter.nextWaterChange || {}),
      $gte: todayStart,
      $lte: todayEnd,
    };
  }

  if (status === "upcoming") {
    filter.nextWaterChange = {
      ...(filter.nextWaterChange || {}),
      $gt: todayEnd,
    };
  }

  const [records, total] =
    await Promise.all([
      populateRecord(
        WaterManagement.find(filter)
          .sort({
            nextWaterChange: 1,
            updatedAt: -1,
          })
          .skip(
            (currentPage - 1) *
              pageSize,
          )
          .limit(pageSize)
          .lean(),
      ),

      WaterManagement.countDocuments(
        filter,
      ),
    ]);

  const formattedRecords =
    records.map((record) => ({
      ...record,

      waterChangeStatus:
        getWaterChangeStatus(
          record.nextWaterChange,
        ),
    }));

  return {
    records: formattedRecords,

    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      pages: Math.ceil(
        total / pageSize,
      ),
    },
  };
};

/*
|--------------------------------------------------------------------------
| Get One Water Management Record
|--------------------------------------------------------------------------
*/

const getWaterManagementById = async (
  id,
) => {
  if (
    !mongoose.isValidObjectId(id)
  ) {
    return null;
  }

  const record =
    await populateRecord(
      WaterManagement.findById(id),
    );

  if (!record) {
    return null;
  }

  const plain = record.toObject();

  return {
    ...plain,

    waterChangeStatus:
      getWaterChangeStatus(
        plain.nextWaterChange,
      ),
  };
};

/*
|--------------------------------------------------------------------------
| Update Water Management
|--------------------------------------------------------------------------
*/

const updateWaterManagement = async ({
  id,
  data,
  ipAddress,
  userAgent,
}) => {
  if (
    !mongoose.isValidObjectId(id)
  ) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const record =
    await WaterManagement.findById(id);

  if (!record) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  if (
    data.pond !== undefined &&
    !(await validatePond(data.pond))
  ) {
    return {
      success: false,
      reason: "POND_NOT_FOUND",
    };
  }

  /*
   * If changing the pond, make sure the new pond
   * does not already have another water-management record.
   */
  if (
    data.pond !== undefined &&
    String(data.pond) !==
      String(record.pond)
  ) {
    const duplicate =
      await WaterManagement.findOne({
        pond: data.pond,
        _id: { $ne: record._id },
      }).lean();

    if (duplicate) {
      return {
        success: false,
        reason: "DUPLICATE_RECORD",
      };
    }
  }

  const fields = [
    "pond",
    "lastWaterChange",
    "nextWaterChange",
    "waterCondition",
    "waterLevel",
    "pumpStatus",
    "electricityStatus",
    "waterChangeNotes",
  ];

  fields.forEach((field) => {
    if (data[field] !== undefined) {
      record[field] = data[field];
    }
  });

  await record.save();

  await ActivityLog.create({
    action: "update",

    entityType:
      "WaterManagement",

    entityId: record._id,

    description:
      "Water-management information was updated.",

    metadata: {
      pondId: record.pond,

      lastWaterChange:
        record.lastWaterChange,

      nextWaterChange:
        record.nextWaterChange,

      waterCondition:
        record.waterCondition,

      waterLevel:
        record.waterLevel,

      pumpStatus:
        record.pumpStatus,

      electricityStatus:
        record.electricityStatus,
    },

    ipAddress:
      ipAddress || "",

    userAgent:
      userAgent || "",
  });

  const updatedRecord =
    await populateRecord(
      WaterManagement.findById(
        record._id,
      ),
    ).lean();

  return {
    success: true,
    record: updatedRecord,
  };
};

/*
|--------------------------------------------------------------------------
| Record Water Change
|--------------------------------------------------------------------------
|
| This is the main day-to-day operation.
|
| lastWaterChange is ALWAYS set by the backend to now.
|
*/

const recordWaterChange = async ({
  id,
  nextWaterChange,
  waterCondition,
  waterLevel,
  pumpStatus,
  electricityStatus,
  waterChangeNotes,
  ipAddress,
  userAgent,
}) => {
  if (
    !mongoose.isValidObjectId(id)
  ) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const record =
    await WaterManagement.findById(id);

  if (!record) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const previousWaterChange =
    record.lastWaterChange;

  /*
   * Automatically record the actual water-change time.
   */
  record.lastWaterChange = new Date();

  if (nextWaterChange !== undefined) {
    record.nextWaterChange =
      nextWaterChange;
  }

  if (waterCondition !== undefined) {
    record.waterCondition =
      waterCondition;
  }

  if (waterLevel !== undefined) {
    record.waterLevel =
      waterLevel;
  }

  if (pumpStatus !== undefined) {
    record.pumpStatus =
      pumpStatus;
  }

  if (
    electricityStatus !== undefined
  ) {
    record.electricityStatus =
      electricityStatus;
  }

  if (
    waterChangeNotes !== undefined
  ) {
    record.waterChangeNotes =
      waterChangeNotes;
  }

  await record.save();

  await ActivityLog.create({
    action: "update",

    entityType:
      "WaterManagement",

    entityId: record._id,

    description:
      "Water change was recorded.",

    metadata: {
      previousWaterChange,

      newWaterChange:
        record.lastWaterChange,

      nextWaterChange:
        record.nextWaterChange,

      pondId: record.pond,

      waterCondition:
        record.waterCondition,

      waterLevel:
        record.waterLevel,

      pumpStatus:
        record.pumpStatus,

      electricityStatus:
        record.electricityStatus,
    },

    ipAddress:
      ipAddress || "",

    userAgent:
      userAgent || "",
  });

  const updatedRecord =
    await populateRecord(
      WaterManagement.findById(
        record._id,
      ),
    ).lean();

  return {
    success: true,
    record: updatedRecord,
  };
};

/*
|--------------------------------------------------------------------------
| Water Change Summary
|--------------------------------------------------------------------------
*/

const getWaterChangeSummary = async () => {
  const records =
    await WaterManagement.find({})
      .select(
        [
          "pond",
          "nextWaterChange",
          "pumpStatus",
          "electricityStatus",
          "waterCondition",
          "waterLevel",
        ].join(" "),
      )
      .populate(
        "pond",
        "name pondName pondNumber status",
      )
      .lean();

  let due = 0;
  let overdue = 0;
  let upcoming = 0;
  let pumpAttention = 0;
  let electricityAttention = 0;

  records.forEach((record) => {
    const status =
      getWaterChangeStatus(
        record.nextWaterChange,
      );

    if (status === "due") {
      due += 1;
    }

    if (status === "overdue") {
      overdue += 1;
    }

    if (status === "upcoming") {
      upcoming += 1;
    }

    if (
      record.pumpStatus ===
        "maintenance" ||
      record.pumpStatus === "faulty"
    ) {
      pumpAttention += 1;
    }

    if (
      record.electricityStatus ===
      "unavailable"
    ) {
      electricityAttention += 1;
    }
  });

  const attentionRecords =
    records.filter((record) => {
      const status =
        getWaterChangeStatus(
          record.nextWaterChange,
        );

      return (
        status === "due" ||
        status === "overdue" ||
        record.pumpStatus ===
          "maintenance" ||
        record.pumpStatus ===
          "faulty" ||
        record.electricityStatus ===
          "unavailable"
      );
    });

  return {
    total: records.length,

    due,

    overdue,

    upcoming,

    pumpAttention,

    electricityAttention,

    attentionRecords,

    generatedAt: new Date(),
  };
};

module.exports = {
  createWaterManagement,

  listWaterManagement,

  getWaterManagementById,

  updateWaterManagement,

  recordWaterChange,

  getWaterChangeSummary,

  getWaterChangeStatus,
};