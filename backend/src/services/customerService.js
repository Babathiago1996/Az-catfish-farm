const mongoose = require("mongoose");

const Customer = require("../models/Customer");
const ActivityLog = require("../models/ActivityLog");

const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
};

const buildFilter = ({
  status,
  search,
}) => {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    const escapedSearch = escapeRegex(search);

    filter.$or = [
      {
        name: {
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
        email: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        address: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
    ];
  }

  return filter;
};

const createCustomer = async ({
  data,
  ipAddress,
  userAgent,
}) => {
  const normalizedName = String(
    data.name,
  ).trim();

  const normalizedPhone = String(
    data.phoneNumber || "",
  ).trim();

  const normalizedEmail = String(
    data.email || "",
  )
    .trim()
    .toLowerCase();

  /*
   * Prevent accidental duplicate customer
   * records when the same identifying information
   * has already been registered.
   *
   * Name alone is not treated as unique because
   * two different customers may legitimately
   * have the same name.
   */
  if (normalizedPhone) {
    const existingByPhone =
      await Customer.findOne({
        phoneNumber: normalizedPhone,
      }).lean();

    if (existingByPhone) {
      return {
        success: false,
        reason: "DUPLICATE_PHONE",
      };
    }
  }

  if (normalizedEmail) {
    const existingByEmail =
      await Customer.findOne({
        email: normalizedEmail,
      }).lean();

    if (existingByEmail) {
      return {
        success: false,
        reason: "DUPLICATE_EMAIL",
      };
    }
  }

  const customer =
    await Customer.create({
      name: normalizedName,

      phoneNumber:
        normalizedPhone,

      email:
        normalizedEmail,

      address:
        data.address || "",

      notes:
        data.notes || "",

      status:
        data.status || "active",
    });

  await ActivityLog.create({
    action: "create",

    entityType: "Customer",

    entityId: customer._id,

    description:
      `Customer ${customer.name} was created.`,

    metadata: {
      customerId:
        customer._id,

      name:
        customer.name,

      phoneNumber:
        customer.phoneNumber,

      email:
        customer.email,

      status:
        customer.status,
    },

    ipAddress:
      ipAddress || "",

    userAgent:
      userAgent || "",
  });

  return {
    success: true,
    customer,
  };
};

const listCustomers = async ({
  status,
  search,
  page = 1,
  limit = 30,
}) => {
  const currentPage = Math.max(
    Number(page) || 1,
    1,
  );

  const pageSize = Math.min(
    Math.max(
      Number(limit) || 30,
      1,
    ),
    100,
  );

  const filter = buildFilter({
    status,
    search,
  });

  const [
    customers,
    total,
  ] = await Promise.all([
    Customer.find(filter)
      .sort({
        createdAt: -1,
        name: 1,
      })
      .skip(
        (currentPage - 1) *
          pageSize,
      )
      .limit(pageSize)
      .lean(),

    Customer.countDocuments(
      filter,
    ),
  ]);

  return {
    customers,

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

const getCustomerById = async (
  id,
) => {
  if (
    !mongoose.isValidObjectId(id)
  ) {
    return null;
  }

  return Customer.findById(id)
    .lean();
};

const updateCustomer = async ({
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

  const customer =
    await Customer.findById(id);

  if (!customer) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const nextPhone =
    data.phoneNumber !== undefined
      ? String(
          data.phoneNumber || "",
        ).trim()
      : customer.phoneNumber;

  const nextEmail =
    data.email !== undefined
      ? String(
          data.email || "",
        )
          .trim()
          .toLowerCase()
      : customer.email;

  if (nextPhone) {
    const existingByPhone =
      await Customer.findOne({
        phoneNumber: nextPhone,

        _id: {
          $ne: customer._id,
        },
      }).lean();

    if (existingByPhone) {
      return {
        success: false,
        reason: "DUPLICATE_PHONE",
      };
    }
  }

  if (nextEmail) {
    const existingByEmail =
      await Customer.findOne({
        email: nextEmail,

        _id: {
          $ne: customer._id,
        },
      }).lean();

    if (existingByEmail) {
      return {
        success: false,
        reason: "DUPLICATE_EMAIL",
      };
    }
  }

  if (data.name !== undefined) {
    customer.name =
      String(data.name).trim();
  }

  if (
    data.phoneNumber !==
    undefined
  ) {
    customer.phoneNumber =
      nextPhone;
  }

  if (data.email !== undefined) {
    customer.email =
      nextEmail;
  }

  if (data.address !== undefined) {
    customer.address =
      data.address || "";
  }

  if (data.notes !== undefined) {
    customer.notes =
      data.notes || "";
  }

  if (data.status !== undefined) {
    customer.status =
      data.status;
  }

  await customer.save();

  await ActivityLog.create({
    action: "update",

    entityType: "Customer",

    entityId: customer._id,

    description:
      `Customer ${customer.name} was updated.`,

    metadata: {
      customerId:
        customer._id,

      name:
        customer.name,

      phoneNumber:
        customer.phoneNumber,

      email:
        customer.email,

      status:
        customer.status,
    },

    ipAddress:
      ipAddress || "",

    userAgent:
      userAgent || "",
  });

  return {
    success: true,

    customer:
      customer.toObject(),
  };
};

const deleteCustomer = async ({
  id,
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

  const customer =
    await Customer.findById(id);

  if (!customer) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  /*
   * Customers are master records.
   *
   * We intentionally use a soft delete
   * through the inactive status instead
   * of physically deleting customer data.
   *
   * This preserves historical business
   * information and prevents accidental
   * removal of a customer record that may
   * later be associated with sales.
   */
  customer.status = "inactive";

  await customer.save();

  await ActivityLog.create({
    action: "delete",

    entityType: "Customer",

    entityId: customer._id,

    description:
      `Customer ${customer.name} was deactivated.`,

    metadata: {
      customerId:
        customer._id,

      name:
        customer.name,

      phoneNumber:
        customer.phoneNumber,

      email:
        customer.email,

      status:
        customer.status,
    },

    ipAddress:
      ipAddress || "",

    userAgent:
      userAgent || "",
  });

  return {
    success: true,
  };
};

const getCustomerSummary = async ({
  status,
}) => {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  const [
    totals,
    byStatus,
  ] = await Promise.all([
    Customer.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: null,

          totalCustomers: {
            $sum: 1,
          },

          activeCustomers: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "active",
                  ],
                },
                1,
                0,
              ],
            },
          },

          inactiveCustomers: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "inactive",
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    Customer.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: "$status",

          count: {
            $sum: 1,
          },
        },
      },

      {
        $project: {
          _id: 0,

          status: "$_id",

          count: 1,
        },
      },

      {
        $sort: {
          status: 1,
        },
      },
    ]),
  ]);

  const result =
    totals[0] || {};

  return {
    totalCustomers:
      result.totalCustomers || 0,

    activeCustomers:
      result.activeCustomers || 0,

    inactiveCustomers:
      result.inactiveCustomers || 0,

    byStatus,
  };
};

module.exports = {
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerSummary,
};