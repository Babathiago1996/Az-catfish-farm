const mongoose = require("mongoose");

const Expense = require("../models/Expense");
const ActivityLog = require("../models/ActivityLog");
const {
  notifyExpenseCreated,
} = require("../services/notificationAutomationService");

const LAGOS_TIMEZONE = "Africa/Lagos";

/*
 * Nigeria uses UTC+01:00 throughout the year.
 *
 * We store Date values normally in MongoDB/UTC,
 * but all farm reporting and day-based filtering
 * is interpreted using Lagos calendar time.
 */

/**
 * Escape user input before placing it inside
 * a MongoDB regular expression.
 */
const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Convert a Date into a YYYY-MM-DD string
 * using Lagos/Nigeria time.
 */
const getLagosDateString = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

/**
 * Return the beginning of a Lagos calendar day
 * as a JavaScript Date representing the correct
 * UTC instant.
 */
const startOfDay = (value) => {
  const dateString = getLagosDateString(value);

  if (!dateString) {
    return null;
  }

  return new Date(`${dateString}T00:00:00+01:00`);
};

/**
 * Return the end of a Lagos calendar day.
 */
const endOfDay = (value) => {
  const dateString = getLagosDateString(value);

  if (!dateString) {
    return null;
  }

  return new Date(`${dateString}T23:59:59.999+01:00`);
};

/**
 * Build a safe date filter.
 */
const buildDateFilter = (from, to) => {
  if (!from && !to) {
    return undefined;
  }

  const filter = {};

  if (from) {
    const start = startOfDay(from);

    if (!start) {
      const error = new Error("Invalid start date.");
      error.code = "INVALID_DATE";
      throw error;
    }

    filter.$gte = start;
  }

  if (to) {
    const end = endOfDay(to);

    if (!end) {
      const error = new Error("Invalid end date.");
      error.code = "INVALID_DATE";
      throw error;
    }

    filter.$lte = end;
  }

  if (filter.$gte && filter.$lte && filter.$gte > filter.$lte) {
    const error = new Error(
      "The start date cannot be later than the end date.",
    );

    error.code = "INVALID_DATE_RANGE";

    throw error;
  }

  return filter;
};

/**
 * Format monetary values consistently.
 */
const roundMoney = (value) => {
  return Number((Number(value) || 0).toFixed(2));
};

/**
 * Create a new expense.
 */
const createExpense = async ({ data, ipAddress, userAgent }) => {
  const session = await mongoose.startSession();

  try {
    let createdExpense = null;

    await session.withTransaction(async () => {
      const expense = await Expense.create(
        [
          {
            category: data.category,

            description: data.description,

            amount: roundMoney(data.amount),

            expenseDate: data.expenseDate || new Date(),

            vendor: data.vendor || "",

            reference: data.reference || "",

            notes: data.notes || "",

            receiptImage: data.receiptImage || "",
          },
        ],
        {
          session,
        },
      );

      createdExpense = expense[0];

      await ActivityLog.create(
        [
          {
            action: "create",

            entityType: "Expense",

            entityId: createdExpense._id,

            description: `Expense of ₦${createdExpense.amount.toLocaleString(
              "en-NG",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            )} was recorded.`,

            metadata: {
              category: createdExpense.category,

              amount: createdExpense.amount,

              description: createdExpense.description,

              expenseDate: createdExpense.expenseDate,

              vendor: createdExpense.vendor,

              reference: createdExpense.reference,
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

    await notifyExpenseCreated({
      expense: createdExpense,
    });

    return createdExpense.toObject();
  } finally {
    await session.endSession();
  }
};

/**
 * List expenses with filtering,
 * pagination and total amount.
 */
const listExpenses = async ({
  category,
  from,
  to,
  search,
  page = 1,
  limit = 30,
}) => {
  const currentPage = Math.max(Number(page) || 1, 1);

  const pageSize = Math.min(Math.max(Number(limit) || 30, 1), 100);

  const filter = {};

  if (category) {
    filter.category = category;
  }

  const dateFilter = buildDateFilter(from, to);

  if (dateFilter) {
    filter.expenseDate = dateFilter;
  }

  if (search) {
    const escapedSearch = escapeRegex(search);

    filter.$or = [
      {
        description: {
          $regex: escapedSearch,
          $options: "i",
        },
      },

      {
        vendor: {
          $regex: escapedSearch,
          $options: "i",
        },
      },

      {
        reference: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
    ];
  }

  const [expenses, total, aggregate] = await Promise.all([
    Expense.find(filter)
      .sort({
        expenseDate: -1,
        createdAt: -1,
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Expense.countDocuments(filter),

    Expense.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: "$amount",
          },
        },
      },
    ]),
  ]);

  return {
    expenses,

    totalAmount: roundMoney(aggregate[0]?.total || 0),

    pagination: {
      page: currentPage,

      limit: pageSize,

      total,

      pages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * Get one expense by ID.
 */
const getExpenseById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return Expense.findById(id).lean();
};

/**
 * Update an expense.
 */
const updateExpense = async ({
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

  const session = await mongoose.startSession();

  try {
    let updatedExpense = null;

    await session.withTransaction(async () => {
      const expense = await Expense.findById(id).session(session);

      if (!expense) {
        const error = new Error("Expense not found.");

        error.code = "NOT_FOUND";

        throw error;
      }

      const allowedFields = [
        "category",
        "description",
        "amount",
        "expenseDate",
        "vendor",
        "reference",
        "notes",
        "receiptImage",
      ];

      allowedFields.forEach((field) => {
        if (data[field] !== undefined) {
          expense[field] = data[field];
        }
      });

      if (data.amount !== undefined) {
        expense.amount = roundMoney(data.amount);
      }

      await expense.save({
        session,
      });

      await ActivityLog.create(
        [
          {
            action: "update",

            entityType: "Expense",

            entityId: expense._id,

            description: `Expense ${expense._id} was updated.`,

            metadata: {
              category: expense.category,

              amount: expense.amount,

              description: expense.description,

              expenseDate: expense.expenseDate,

              vendor: expense.vendor,

              reference: expense.reference,
            },

            ipAddress: ipAddress || "",

            userAgent: userAgent || "",
          },
        ],
        {
          session,
        },
      );

      updatedExpense = expense.toObject();
    });

    return {
      success: true,

      expense: updatedExpense,
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
 * Delete an expense.
 */
const deleteExpense = async ({
  id,
  ipAddress,
  userAgent,
}) => {
  if (!mongoose.isValidObjectId(id)) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const expense = await Expense.findById(id).session(session);

      if (!expense) {
        const error = new Error("Expense not found.");

        error.code = "NOT_FOUND";

        throw error;
      }

      await ActivityLog.create(
        [
          {
            action: "delete",

            entityType: "Expense",

            entityId: expense._id,

            description: `Expense ${expense._id} was deleted.`,

            metadata: {
              category: expense.category,

              amount: expense.amount,

              description: expense.description,

              expenseDate: expense.expenseDate,

              vendor: expense.vendor,

              reference: expense.reference,
            },

            ipAddress: ipAddress || "",

            userAgent: userAgent || "",
          },
        ],
        {
          session,
        },
      );

      await Expense.deleteOne(
        {
          _id: expense._id,
        },
        {
          session,
        },
      );
    });

    return {
      success: true,
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
 * Expense summary.
 *
 * All day/month grouping is explicitly
 * performed using Africa/Lagos.
 */
const getExpenseSummary = async ({ from, to, category }) => {
  const match = {};

  const dateFilter = buildDateFilter(from, to);

  if (dateFilter) {
    match.expenseDate = dateFilter;
  }

  if (category) {
    match.category = category;
  }

  const [totals, byCategory, byMonth, byDay] =
    await Promise.all([
      Expense.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id: null,

            totalExpenses: {
              $sum: "$amount",
            },

            expenseCount: {
              $sum: 1,
            },
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id: "$category",

            amount: {
              $sum: "$amount",
            },

            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            amount: -1,
          },
        },

        {
          $project: {
            _id: 0,

            category: "$_id",

            amount: 1,

            count: 1,
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id: {
              year: {
                $year: {
                  date: "$expenseDate",
                  timezone: LAGOS_TIMEZONE,
                },
              },

              month: {
                $month: {
                  date: "$expenseDate",
                  timezone: LAGOS_TIMEZONE,
                },
              },
            },

            amount: {
              $sum: "$amount",
            },
          },
        },

        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },

        {
          $project: {
            _id: 0,

            year: "$_id.year",

            month: "$_id.month",

            amount: 1,
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",

                date: "$expenseDate",

                timezone: LAGOS_TIMEZONE,
              },
            },

            amount: {
              $sum: "$amount",
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

            amount: 1,
          },
        },
      ]),
    ]);

  return {
    totalExpenses: roundMoney(
      totals[0]?.totalExpenses || 0,
    ),

    expenseCount: totals[0]?.expenseCount || 0,

    byCategory: byCategory.map((item) => ({
      ...item,

      amount: roundMoney(item.amount),
    })),

    byMonth: byMonth.map((item) => ({
      ...item,

      amount: roundMoney(item.amount),
    })),

    byDay: byDay.map((item) => ({
      ...item,

      amount: roundMoney(item.amount),
    })),
  };
};

/**
 * Get expenses for a particular
 * Lagos calendar month.
 */
const getMonthlyExpenses = async (year, month) => {
  const numericYear = Number(year);

  const numericMonth = Number(month);

  if (
    !Number.isInteger(numericYear) ||
    !Number.isInteger(numericMonth) ||
    numericMonth < 1 ||
    numericMonth > 12
  ) {
    const error = new Error("Invalid year or month.");

    error.code = "INVALID_MONTH";

    throw error;
  }

  const monthString = String(numericMonth).padStart(2, "0");

  const firstDay = new Date(
    `${numericYear}-${monthString}-01T00:00:00+01:00`,
  );

  const nextMonth =
    numericMonth === 12
      ? `${numericYear + 1}-01`
      : `${numericYear}-${String(numericMonth + 1).padStart(
          2,
          "0",
        )}`;

  const lastDay = new Date(
    `${nextMonth}-01T00:00:00+01:00`,
  );

  lastDay.setMilliseconds(
    lastDay.getMilliseconds() - 1,
  );

  return getExpenseSummary({
    from: firstDay,
    to: lastDay,
  });
};

module.exports = {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getMonthlyExpenses,
};