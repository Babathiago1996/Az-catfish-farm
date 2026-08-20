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

  date.setHours(
    0,
    0,
    0,
    0,
  );

  return date;
};

const dateEnd = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(
    23,
    59,
    59,
    999,
  );

  return date;
};

/*
|--------------------------------------------------------------------------
| Water Change Status
|--------------------------------------------------------------------------
*/

const getWaterChangeStatus = (
  nextWaterChange,
) => {
  if (!nextWaterChange) {
    return "unknown";
  }

  const today =
    dateStart(new Date());

  const nextDate =
    dateStart(nextWaterChange);

  if (!today || !nextDate) {
    return "unknown";
  }

  if (nextDate < today) {
    return "overdue";
  }

  if (
    nextDate.getTime() ===
    today.getTime()
  ) {
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
    !mongoose.isValidObjectId(
      pondId,
    )
  ) {
    return false;
  }

  const query = Pond.exists({
    _id: pondId,
  });

  if (session) {
    query.session(session);
  }

  return Boolean(
    await query,
  );
};

/*
|--------------------------------------------------------------------------
| Population
|--------------------------------------------------------------------------
*/

const populateRecord = (
  query,
) =>
  query.populate(
    "pond",
    "name pondName pondNumber pondType pondSize status currentFishCount",
  );

/*
|--------------------------------------------------------------------------
| Water Parameters
|--------------------------------------------------------------------------
*/

const buildWaterParameters = (
  data,
) => {
  if (!data.waterParameters) {
    return undefined;
  }

  return {
    temperature:
      data.waterParameters
        .temperature ??
      null,

    ph:
      data.waterParameters
        .ph ?? null,

    dissolvedOxygen:
      data.waterParameters
        .dissolvedOxygen ??
      null,

    ammonia:
      data.waterParameters
        .ammonia ?? null,

    nitrite:
      data.waterParameters
        .nitrite ?? null,
  };
};

const applyWaterParameters = (
  record,
  data,
) => {
  if (!data.waterParameters) {
    return;
  }

  const fields = [
    "temperature",
    "ph",
    "dissolvedOxygen",
    "ammonia",
    "nitrite",
  ];

  if (!record.waterParameters) {
    record.waterParameters = {};
  }

  fields.forEach(
    (field) => {
      if (
        data.waterParameters[
          field
        ] !== undefined
      ) {
        record.waterParameters[
          field
        ] =
          data.waterParameters[
            field
          ];
      }
    },
  );
};

/*
|--------------------------------------------------------------------------
| Create / Upsert Water Management
|--------------------------------------------------------------------------
*/

const createWaterManagement =
  async ({
    data,
    ipAddress,
    userAgent,
  }) => {
    if (
      !(await validatePond(
        data.pond,
      ))
    ) {
      return {
        success: false,
        reason:
          "POND_NOT_FOUND",
      };
    }

    const recordData = {
      pond: data.pond,

      lastWaterChange:
        data.lastWaterChange ??
        null,

      nextWaterChange:
        data.nextWaterChange ??
        null,

      waterQualityNotes:
        data.waterQualityNotes ??
        "",

      pumpStatus:
        data.pumpStatus ??
        "working",

      electricityStatus:
        data.electricityStatus ??
        "available",

      pumpMaintenanceDate:
        data.pumpMaintenanceDate ??
        null,

      nextPumpMaintenanceDate:
        data.nextPumpMaintenanceDate ??
        null,

      generatorMaintenanceDate:
        data.generatorMaintenanceDate ??
        null,

      nextGeneratorMaintenanceDate:
        data.nextGeneratorMaintenanceDate ??
        null,

      notes:
        data.notes ?? "",
    };

    const waterParameters =
      buildWaterParameters(
        data,
      );

    if (
      waterParameters !==
      undefined
    ) {
      recordData.waterParameters =
        waterParameters;
    }

    const session =
      await mongoose.startSession();

    let created = false;
    let recordId = null;

    try {
      await session.withTransaction(
        async () => {
          /*
           * Ensure pond still exists
           * inside transaction.
           */
          const pondExists =
            await validatePond(
              data.pond,
              session,
            );

          if (!pondExists) {
            const error =
              new Error(
                "The selected pond was not found.",
              );

            error.code =
              "POND_NOT_FOUND";

            throw error;
          }

          const existing =
            await WaterManagement.findOne(
              {
                pond: data.pond,
              },
            ).session(session);

          let record;

          if (existing) {
            Object.assign(
              existing,
              recordData,
            );

            if (
              waterParameters !==
              undefined
            ) {
              existing.waterParameters =
                waterParameters;
            }

            record =
              await existing.save({
                session,
              });

            created = false;
          } else {
            [
              record,
            ] =
              await WaterManagement.create(
                [recordData],
                {
                  session,
                },
              );

            created = true;
          }

          recordId =
            record._id;

          await ActivityLog.create(
            [
              {
                action:
                  created
                    ? "create"
                    : "update",

                entityType:
                  "WaterManagement",

                entityId:
                  record._id,

                description: `Water-management information was ${
                  created
                    ? "recorded"
                    : "updated"
                }.`,

                metadata: {
                  pondId:
                    record.pond,

                  nextWaterChange:
                    record.nextWaterChange,

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
        },
      );

      const savedRecord =
        await populateRecord(
          WaterManagement.findById(
            recordId,
          ),
        ).lean();

      /*
       * Only send the "created"
       * notification for a new record.
       */
      if (created) {
        try {
          await notifyWaterRecordCreated(
            {
              water:
                savedRecord,

              record:
                savedRecord,
            },
          );
        } catch (
          notificationError
        ) {
          console.error(
            "Water-management notification failed:",
            notificationError.message,
          );
        }
      }

      return {
        success: true,

        record:
          savedRecord,

        created,
      };
    } catch (error) {
      if (
        error.code ===
        "POND_NOT_FOUND"
      ) {
        return {
          success: false,
          reason:
            "POND_NOT_FOUND",
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

const listWaterManagement =
  async ({
    pond,
    status,
    from,
    to,
    page = 1,
    limit = 30,
  }) => {
    const currentPage =
      Math.max(
        Number(page) || 1,
        1,
      );

    const pageSize =
      Math.min(
        Math.max(
          Number(limit) || 30,
          1,
        ),
        100,
      );

    const filter = {};

    if (pond) {
      filter.pond = pond;
    }

    if (from || to) {
      filter.nextWaterChange =
        {};

      if (from) {
        const start =
          dateStart(from);

        if (start) {
          filter.nextWaterChange.$gte =
            start;
        }
      }

      if (to) {
        const end =
          dateEnd(to);

        if (end) {
          filter.nextWaterChange.$lte =
            end;
        }
      }
    }

    const todayStart =
      dateStart(new Date());

    const todayEnd =
      dateEnd(new Date());

    if (status === "overdue") {
      filter.nextWaterChange = {
        ...(filter.nextWaterChange ||
          {}),

        $lt: todayStart,
      };
    }

    if (status === "due") {
      filter.nextWaterChange = {
        ...(filter.nextWaterChange ||
          {}),

        $gte: todayStart,

        $lte: todayEnd,
      };
    }

    if (status === "upcoming") {
      filter.nextWaterChange = {
        ...(filter.nextWaterChange ||
          {}),

        $gt: todayEnd,
      };
    }

    const [
      records,
      total,
    ] = await Promise.all([
      populateRecord(
        WaterManagement.find(
          filter,
        )
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
      records.map(
        (record) => ({
          ...record,

          waterChangeStatus:
            getWaterChangeStatus(
              record.nextWaterChange,
            ),
        }),
      );

    return {
      records:
        formattedRecords,

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
| Get Water Management
|--------------------------------------------------------------------------
*/

const getWaterManagementById =
  async (id) => {
    if (
      !mongoose.isValidObjectId(
        id,
      )
    ) {
      return null;
    }

    const record =
      await populateRecord(
        WaterManagement.findById(
          id,
        ),
      );

    if (!record) {
      return null;
    }

    const plain =
      record.toObject();

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

const updateWaterManagement =
  async ({
    id,
    data,
    ipAddress,
    userAgent,
  }) => {
    if (
      !mongoose.isValidObjectId(
        id,
      )
    ) {
      return {
        success: false,
        reason: "NOT_FOUND",
      };
    }

    const record =
      await WaterManagement.findById(
        id,
      );

    if (!record) {
      return {
        success: false,
        reason: "NOT_FOUND",
      };
    }

    if (
      data.pond !== undefined &&
      !(await validatePond(
        data.pond,
      ))
    ) {
      return {
        success: false,
        reason:
          "POND_NOT_FOUND",
      };
    }

    const fields = [
      "pond",
      "lastWaterChange",
      "nextWaterChange",
      "waterQualityNotes",
      "pumpStatus",
      "electricityStatus",
      "pumpMaintenanceDate",
      "nextPumpMaintenanceDate",
      "generatorMaintenanceDate",
      "nextGeneratorMaintenanceDate",
      "notes",
    ];

    fields.forEach(
      (field) => {
        if (
          data[field] !==
          undefined
        ) {
          record[field] =
            data[field];
        }
      },
    );

    applyWaterParameters(
      record,
      data,
    );

    await record.save();

    await ActivityLog.create({
      action: "update",

      entityType:
        "WaterManagement",

      entityId:
        record._id,

      description:
        "Water-management information was updated.",

      metadata: {
        pondId:
          record.pond,

        lastWaterChange:
          record.lastWaterChange,

        nextWaterChange:
          record.nextWaterChange,

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

      record:
        updatedRecord,
    };
  };

/*
|--------------------------------------------------------------------------
| Record Water Change
|--------------------------------------------------------------------------
*/

const recordWaterChange =
  async ({
    id,
    nextWaterChange,
    waterQualityNotes,
    waterParameters,
    pumpStatus,
    electricityStatus,
    notes,
    ipAddress,
    userAgent,
  }) => {
    if (
      !mongoose.isValidObjectId(
        id,
      )
    ) {
      return {
        success: false,
        reason: "NOT_FOUND",
      };
    }

    const record =
      await WaterManagement.findById(
        id,
      );

    if (!record) {
      return {
        success: false,
        reason: "NOT_FOUND",
      };
    }

    const previousWaterChange =
      record.lastWaterChange;

    record.lastWaterChange =
      new Date();

    if (
      nextWaterChange !==
      undefined
    ) {
      record.nextWaterChange =
        nextWaterChange;
    }

    if (
      waterQualityNotes !==
      undefined
    ) {
      record.waterQualityNotes =
        waterQualityNotes;
    }

    if (
      pumpStatus !== undefined
    ) {
      record.pumpStatus =
        pumpStatus;
    }

    if (
      electricityStatus !==
      undefined
    ) {
      record.electricityStatus =
        electricityStatus;
    }

    if (notes !== undefined) {
      record.notes = notes;
    }

    if (
      waterParameters !==
      undefined
    ) {
      applyWaterParameters(
        record,
        {
          waterParameters,
        },
      );
    }

    await record.save();

    /*
     * ActivityLog does not have
     * "water_change" in its enum.
     * Therefore "update" is used.
     */
    await ActivityLog.create({
      action: "update",

      entityType:
        "WaterManagement",

      entityId:
        record._id,

      description:
        "Water change was recorded.",

      metadata: {
        previousWaterChange,

        newWaterChange:
          record.lastWaterChange,

        nextWaterChange:
          record.nextWaterChange,

        pondId:
          record.pond,
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

      record:
        updatedRecord,
    };
  };

/*
|--------------------------------------------------------------------------
| Water Change Summary
|--------------------------------------------------------------------------
*/

const getWaterChangeSummary =
  async () => {
    const records =
      await WaterManagement.find(
        {
          nextWaterChange: {
            $ne: null,
          },
        },
      )
        .select(
          [
            "pond",
            "nextWaterChange",
            "pumpStatus",
            "electricityStatus",
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

    let electricityAttention =
      0;

    records.forEach(
      (record) => {
        const status =
          getWaterChangeStatus(
            record.nextWaterChange,
          );

        if (status === "due") {
          due += 1;
        }

        if (
          status === "overdue"
        ) {
          overdue += 1;
        }

        if (
          status === "upcoming"
        ) {
          upcoming += 1;
        }

        if (
          record.pumpStatus ===
            "maintenance" ||
          record.pumpStatus ===
            "faulty"
        ) {
          pumpAttention += 1;
        }

        if (
          record.electricityStatus ===
          "unavailable"
        ) {
          electricityAttention +=
            1;
        }
      },
    );

    const attentionRecords =
      records.filter(
        (record) => {
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
        },
      );

    return {
      total:
        records.length,

      due,

      overdue,

      upcoming,

      pumpAttention,

      electricityAttention,

      attentionRecords,

      generatedAt:
        new Date(),
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