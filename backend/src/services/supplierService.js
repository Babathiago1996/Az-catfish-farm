const mongoose = require("mongoose");

const Supplier = require("../models/Supplier");
const ActivityLog = require("../models/ActivityLog");

const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
};

const buildSearchFilter = (search) => {
  if (!search) {
    return null;
  }

  const escapedSearch = escapeRegex(search);

  return {
    $or: [
      {
        name: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        contactPerson: {
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
    ],
  };
};

const createSupplier = async ({
  data,
  ipAddress,
  userAgent,
}) => {
  const supplier = await Supplier.create({
    name: data.name,

    contactPerson:
      data.contactPerson || "",

    phoneNumber:
      data.phoneNumber || "",

    email:
      data.email || "",

    address:
      data.address || "",

    notes:
      data.notes || "",

    status:
      data.status || "active",
  });

  await ActivityLog.create({
    action: "create",

    entityType: "Supplier",

    entityId: supplier._id,

    description:
      `Supplier ${supplier.name} was created.`,

    metadata: {
      supplierId: supplier._id,

      name: supplier.name,

      contactPerson:
        supplier.contactPerson,

      phoneNumber:
        supplier.phoneNumber,

      email:
        supplier.email,

      status:
        supplier.status,
    },

    ipAddress:
      ipAddress || "",

    userAgent:
      userAgent || "",
  });

  return supplier;
};

const listSuppliers = async ({
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

  const filter = {};

  if (status) {
    filter.status = status;
  }

  const searchFilter =
    buildSearchFilter(search);

  if (searchFilter) {
    Object.assign(
      filter,
      searchFilter,
    );
  }

  const [suppliers, total] =
    await Promise.all([
      Supplier.find(filter)
        .sort({
          name: 1,
          createdAt: -1,
        })
        .skip(
          (currentPage - 1) *
            pageSize,
        )
        .limit(pageSize)
        .lean(),

      Supplier.countDocuments(filter),
    ]);

  return {
    suppliers,

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

const getSupplierById = async (
  id,
) => {
  if (
    !mongoose.isValidObjectId(id)
  ) {
    return null;
  }

  return Supplier.findById(id)
    .lean();
};

const updateSupplier = async ({
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

  const supplier =
    await Supplier.findById(id);

  if (!supplier) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  const allowedFields = [
    "name",
    "contactPerson",
    "phoneNumber",
    "email",
    "address",
    "notes",
    "status",
  ];

  allowedFields.forEach(
    (field) => {
      if (
        data[field] !== undefined
      ) {
        supplier[field] =
          data[field];
      }
    },
  );

  await supplier.save();

  await ActivityLog.create({
    action: "update",

    entityType: "Supplier",

    entityId: supplier._id,

    description:
      `Supplier ${supplier.name} was updated.`,

    metadata: {
      supplierId: supplier._id,

      name: supplier.name,

      contactPerson:
        supplier.contactPerson,

      phoneNumber:
        supplier.phoneNumber,

      email:
        supplier.email,

      status:
        supplier.status,
    },

    ipAddress:
      ipAddress || "",

    userAgent:
      userAgent || "",
  });

  return {
    success: true,

    supplier:
      supplier.toObject(),
  };
};

const deleteSupplier = async ({
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

  const supplier =
    await Supplier.findById(id);

  if (!supplier) {
    return {
      success: false,
      reason: "NOT_FOUND",
    };
  }

  await Supplier.deleteOne({
    _id: supplier._id,
  });

  await ActivityLog.create({
    action: "delete",

    entityType: "Supplier",

    entityId: supplier._id,

    description:
      `Supplier ${supplier.name} was deleted.`,

    metadata: {
      supplierId: supplier._id,

      name: supplier.name,

      contactPerson:
        supplier.contactPerson,

      phoneNumber:
        supplier.phoneNumber,

      email:
        supplier.email,

      status:
        supplier.status,
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

module.exports = {
  createSupplier,
  listSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
};