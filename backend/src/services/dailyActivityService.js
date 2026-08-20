const mongoose = require("mongoose");

const DailyActivity = require("../models/DailyActivity");
const Pond = require("../models/Pond");

const ACTIVITY_TIME_ZONE = "Africa/Lagos";

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

const buildDateFilter = (from, to) => {
  const filter = {};

  if (from) {
    const start = startOfDay(from);

    if (start) {
      filter.$gte = start;
    }
  }

  if (to) {
    const end = endOfDay(to);

    if (end) {
      filter.$lte = end;
    }
  }

  return filter;
};

const ensurePondExists = async (pondId) => {
  if (!pondId) {
    return true;
  }

  if (!mongoose.isValidObjectId(pondId)) {
    return false;
  }

  const pond = await Pond.exists({
    _id: pondId,
  });

  return Boolean(pond);
};

const createActivity = async ({ data, adminId }) => {
  if (data.pond) {
    const pondExists = await ensurePondExists(data.pond);

    if (!pondExists) {
      return {
        success: false,
        reason: "POND_NOT_FOUND",
      };
    }
  }

  const activity = await DailyActivity.create({
    date: data.date,
    time: data.time || "",
    period: data.period || "morning",
    type: data.type,
    pond: data.pond || null,
    title: data.title,
    notes: data.notes || "",
    completed: data.completed !== undefined ? data.completed : true,
    createdBy: adminId,
  });

  return {
    success: true,
    activity: await getActivityById(activity._id),
  };
};

const getActivityById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return DailyActivity.findById(id)
    .populate({
      path: "pond",
      select: "name pondNumber pondType status",
    })
    .lean();
};

const getActivities = async ({
  from,
  to,
  pond,
  type,
  period,
  completed,
  page = 1,
  limit = 30,
} = {}) => {
  const filter = {};

  const dateFilter = buildDateFilter(from, to);

  if (Object.keys(dateFilter).length) {
    filter.date = dateFilter;
  }

  if (pond) {
    if (!mongoose.isValidObjectId(pond)) {
      return {
        activities: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      };
    }

    filter.pond = pond;
  }

  if (type) {
    filter.type = type;
  }

  if (period) {
    filter.period = period;
  }

  if (completed !== undefined) {
    filter.completed = completed === true || completed === "true";
  }

  const safePage = Math.max(Number(page) || 1, 1);

  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);

  const skip = (safePage - 1) * safeLimit;

  const [activities, total] = await Promise.all([
    DailyActivity.find(filter)
      .populate({
        path: "pond",
        select: "name pondNumber pondType status",
      })
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    DailyActivity.countDocuments(filter),
  ]);

  return {
    activities,

    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: total > 0 ? Math.ceil(total / safeLimit) : 0,
    },
  };
};

const getActivity = async (id) => {
  const activity = await getActivityById(id);

  if (!activity) {
    return {
      success: false,
      reason: "ACTIVITY_NOT_FOUND",
    };
  }

  return {
    success: true,
    activity,
  };
};

const updateActivity = async ({ activityId, data }) => {
  const activity = await DailyActivity.findById(activityId);

  if (!activity) {
    return {
      success: false,
      reason: "ACTIVITY_NOT_FOUND",
    };
  }

  if (data.pond !== undefined && data.pond !== null) {
    const pondExists = await ensurePondExists(data.pond);

    if (!pondExists) {
      return {
        success: false,
        reason: "POND_NOT_FOUND",
      };
    }
  }

  const allowedFields = [
    "date",
    "time",
    "period",
    "type",
    "pond",
    "title",
    "notes",
    "completed",
  ];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      activity[field] = data[field];
    }
  });

  await activity.save();

  return {
    success: true,
    activity: await getActivityById(activity._id),
  };
};

const deleteActivity = async (activityId) => {
  const activity = await DailyActivity.findById(activityId);

  if (!activity) {
    return {
      success: false,
      reason: "ACTIVITY_NOT_FOUND",
    };
  }

  await activity.deleteOne();

  return {
    success: true,
  };
};

const getDailySummary = async ({ date, pond } = {}) => {
  const filter = {};

  if (date) {
    const start = startOfDay(date);

    const end = endOfDay(date);

    if (start && end) {
      filter.date = {
        $gte: start,
        $lte: end,
      };
    }
  }

  if (pond) {
    if (!mongoose.isValidObjectId(pond)) {
      return {
        date: date || null,
        totalActivities: 0,
        completedActivities: 0,
        pendingActivities: 0,
        byType: [],
        byPeriod: [],
      };
    }

    filter.pond = pond;
  }

  const [totalActivities, completedActivities, byType, byPeriod] =
    await Promise.all([
      DailyActivity.countDocuments(filter),

      DailyActivity.countDocuments({
        ...filter,
        completed: true,
      }),

      DailyActivity.aggregate([
        {
          $match: filter,
        },
        {
          $group: {
            _id: "$type",
            count: {
              $sum: 1,
            },
            completed: {
              $sum: {
                $cond: ["$completed", 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            type: "$_id",
            count: 1,
            completed: 1,
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]),

      DailyActivity.aggregate([
        {
          $match: filter,
        },
        {
          $group: {
            _id: "$period",
            count: {
              $sum: 1,
            },
            completed: {
              $sum: {
                $cond: ["$completed", 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            period: "$_id",
            count: 1,
            completed: 1,
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]),
    ]);

  return {
    date: date || null,
    timeZone: ACTIVITY_TIME_ZONE,
    totalActivities,
    completedActivities,
    pendingActivities: Math.max(totalActivities - completedActivities, 0),
    byType,
    byPeriod,
  };
};

module.exports = {
  createActivity,
  getActivity,
  getActivities,
  updateActivity,
  deleteActivity,
  getDailySummary,
  startOfDay,
  endOfDay,
  ACTIVITY_TIME_ZONE,
};
