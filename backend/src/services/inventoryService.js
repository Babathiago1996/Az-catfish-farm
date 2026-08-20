const mongoose = require("mongoose");

const Inventory = require("../models/Inventory");
const InventoryTransaction = require("../models/InventoryTransaction");

const INVENTORY_CATEGORIES = [
  "feed",
  "salt",
  "medicine",
  "nets",
  "buckets",
  "pipes",
  "fuel",
  "equipment",
  "other",
];

const TRANSACTION_TYPES = [
  "stock_in",
  "stock_out",
  "adjustment",
  "return",
  "damaged",
  "expired",
];

const REFERENCE_TYPES = [
  "feeding",
  "expense",
  "manual",
  "purchase",
  "adjustment",
  "other",
];

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const toNumber = (value, fieldName) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return number;
};

const normalizeName = (value) => {
  return String(value || "").trim();
};

const normalizeOptionalString = (value) => {
  return String(value || "").trim();
};

const validateObjectId = (id, label = "inventory ID") => {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error(`Invalid ${label}.`);
  }
};

const validateCategory = (category) => {
  if (
    category !== undefined &&
    category !== null &&
    !INVENTORY_CATEGORIES.includes(category)
  ) {
    throw new Error("Invalid inventory category.");
  }
};

const validateReferenceType = (referenceType) => {
  if (
    referenceType !== undefined &&
    referenceType !== null &&
    !REFERENCE_TYPES.includes(referenceType)
  ) {
    throw new Error("Invalid inventory reference type.");
  }
};

const validateTransactionType = (transactionType) => {
  if (
    transactionType !== undefined &&
    transactionType !== null &&
    !TRANSACTION_TYPES.includes(transactionType)
  ) {
    throw new Error("Invalid inventory transaction type.");
  }
};

const parsePositiveInteger = (value, fallback, maximum) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(number), 1), maximum);
};

const parsePage = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 1;
  }

  return Math.max(Math.floor(number), 1);
};

const parseDate = (value, label) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return date;
};

const getTransactionDirection = (
  transactionType,
  previousQuantity,
  newQuantity,
) => {
  if (transactionType === "stock_in") {
    return "in";
  }

  if (transactionType === "return") {
    return "in";
  }

  if (
    transactionType === "stock_out" ||
    transactionType === "damaged" ||
    transactionType === "expired"
  ) {
    return "out";
  }

  if (transactionType === "adjustment") {
    if (newQuantity > previousQuantity) {
      return "in";
    }

    if (newQuantity < previousQuantity) {
      return "out";
    }

    return "neutral";
  }

  return "neutral";
};

const buildTransactionView = (transaction) => {
  const previousQuantity = Number(transaction.previousQuantity || 0);

  const newQuantity = Number(transaction.newQuantity || 0);

  const quantity = Number(transaction.quantity || 0);

  const unitCost = Number(transaction.unitCost || 0);

  return {
    ...transaction,
    direction: getTransactionDirection(
      transaction.transactionType,
      previousQuantity,
      newQuantity,
    ),
    quantity,
    previousQuantity,
    newQuantity,
    unitCost,
    totalValue:
      transaction.totalValue !== undefined
        ? Number(transaction.totalValue)
        : quantity * unitCost,
  };
};

class InventoryService {
  /*
   * ---------------------------------------------------------
   * CREATE
   * ---------------------------------------------------------
   */

  async createItem(payload = {}) {
    const name = normalizeName(payload.name);

    if (!name) {
      throw new Error("Inventory item name is required.");
    }

    validateCategory(payload.category);

    const quantity = toNumber(payload.quantity ?? 0, "Quantity");

    const reorderLevel = toNumber(payload.reorderLevel ?? 0, "Reorder level");

    const unitCost = toNumber(payload.unitCost ?? 0, "Unit cost");

    if (quantity < 0) {
      throw new Error("Quantity cannot be negative.");
    }

    if (reorderLevel < 0) {
      throw new Error("Reorder level cannot be negative.");
    }

    if (unitCost < 0) {
      throw new Error("Unit cost cannot be negative.");
    }

    const existingItem = await Inventory.findOne({
      name: {
        $regex: `^${escapeRegex(name)}$`,
        $options: "i",
      },
    });

    if (existingItem) {
      throw new Error("An inventory item with this name already exists.");
    }

    const item = await Inventory.create({
      name,
      category: payload.category,
      description: normalizeOptionalString(payload.description),
      quantity,
      unit: normalizeOptionalString(payload.unit),
      reorderLevel,
      unitCost,
      supplier: normalizeOptionalString(payload.supplier),
      storageLocation: normalizeOptionalString(payload.storageLocation),
      lastRestockedAt: quantity > 0 ? new Date() : null,
      isActive:
        payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      notes: normalizeOptionalString(payload.notes),
    });

    /*
     * Opening stock is a real transaction.
     */
    if (quantity > 0) {
      try {
        await this.createTransaction({
          inventoryItem: item._id,
          transactionType: "stock_in",
          quantity,
          previousQuantity: 0,
          newQuantity: quantity,
          unitCost,
          referenceType: "manual",
          notes: "Initial inventory quantity.",
        });
      } catch (error) {
        await Inventory.deleteOne({
          _id: item._id,
        });

        throw error;
      }
    }

    return item;
  }

  /*
   * ---------------------------------------------------------
   * LIST
   * ---------------------------------------------------------
   */

  async getAll(filters = {}) {
    const query = {
      isActive: true,
    };

    if (filters.category) {
      validateCategory(filters.category);
      query.category = filters.category;
    }

    if (filters.status) {
      const status = String(filters.status).toLowerCase();

      if (!["healthy", "low_stock", "stockout"].includes(status)) {
        throw new Error("Invalid inventory status.");
      }

      if (status === "stockout") {
        query.quantity = 0;
      }

      if (status === "low_stock") {
        query.$expr = {
          $and: [
            {
              $lte: ["$quantity", "$reorderLevel"],
            },
            {
              $gt: ["$quantity", 0],
            },
          ],
        };
      }

      if (status === "healthy") {
        query.$expr = {
          $gt: ["$quantity", "$reorderLevel"],
        };
      }
    }

    /*
     * Backwards compatibility with the
     * previous lowStock=true filter.
     */
    if (filters.lowStock === "true" && !filters.status) {
      query.$expr = {
        $lte: ["$quantity", "$reorderLevel"],
      };
    }

    if (filters.search) {
      const search = String(filters.search).trim();

      if (search) {
        query.$or = [
          {
            name: {
              $regex: escapeRegex(search),
              $options: "i",
            },
          },
          {
            description: {
              $regex: escapeRegex(search),
              $options: "i",
            },
          },
          {
            supplier: {
              $regex: escapeRegex(search),
              $options: "i",
            },
          },
          {
            storageLocation: {
              $regex: escapeRegex(search),
              $options: "i",
            },
          },
        ];
      }
    }

    return Inventory.find(query).sort({
      category: 1,
      name: 1,
    });
  }

  /*
   * ---------------------------------------------------------
   * SINGLE ITEM
   * ---------------------------------------------------------
   */

  async getById(id) {
    validateObjectId(id);

    const item = await Inventory.findById(id);

    if (!item) {
      throw new Error("Inventory item not found.");
    }

    return item;
  }

  /*
   * ---------------------------------------------------------
   * UPDATE MASTER DATA
   * ---------------------------------------------------------
   *
   * Quantity is intentionally excluded.
   */

  async updateItem(id, payload = {}) {
    const item = await this.getById(id);

    const allowedFields = [
      "name",
      "category",
      "description",
      "unit",
      "reorderLevel",
      "unitCost",
      "supplier",
      "storageLocation",
      "isActive",
      "notes",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        updates[field] = payload[field];
      }
    }

    if (updates.name !== undefined) {
      updates.name = normalizeName(updates.name);

      if (!updates.name) {
        throw new Error("Inventory item name cannot be empty.");
      }

      const duplicate = await Inventory.findOne({
        _id: {
          $ne: item._id,
        },
        name: {
          $regex: `^${escapeRegex(updates.name)}$`,
          $options: "i",
        },
      });

      if (duplicate) {
        throw new Error("Another inventory item already uses this name.");
      }
    }

    if (updates.category !== undefined) {
      validateCategory(updates.category);
    }

    if (updates.reorderLevel !== undefined) {
      updates.reorderLevel = toNumber(updates.reorderLevel, "Reorder level");

      if (updates.reorderLevel < 0) {
        throw new Error("Reorder level cannot be negative.");
      }
    }

    if (updates.unitCost !== undefined) {
      updates.unitCost = toNumber(updates.unitCost, "Unit cost");

      if (updates.unitCost < 0) {
        throw new Error("Unit cost cannot be negative.");
      }
    }

    if (updates.description !== undefined) {
      updates.description = normalizeOptionalString(updates.description);
    }

    if (updates.unit !== undefined) {
      updates.unit = normalizeOptionalString(updates.unit);
    }

    if (updates.supplier !== undefined) {
      updates.supplier = normalizeOptionalString(updates.supplier);
    }

    if (updates.storageLocation !== undefined) {
      updates.storageLocation = normalizeOptionalString(
        updates.storageLocation,
      );
    }

    if (updates.notes !== undefined) {
      updates.notes = normalizeOptionalString(updates.notes);
    }

    Object.assign(item, updates);

    await item.save();

    return item;
  }

  /*
   * ---------------------------------------------------------
   * SOFT DELETE
   * ---------------------------------------------------------
   */

  async deleteItem(id) {
    const item = await this.getById(id);

    item.isActive = false;

    await item.save();

    return item;
  }

  /*
   * ---------------------------------------------------------
   * TRANSACTION CREATION
   * ---------------------------------------------------------
   */

  async createTransaction(data = {}) {
    validateTransactionType(data.transactionType);

    validateReferenceType(data.referenceType);

    const quantity = toNumber(data.quantity, "Transaction quantity");

    const previousQuantity = toNumber(
      data.previousQuantity,
      "Previous quantity",
    );

    const newQuantity = toNumber(data.newQuantity, "New quantity");

    const unitCost = toNumber(data.unitCost ?? 0, "Unit cost");

    if (quantity < 0) {
      throw new Error("Transaction quantity cannot be negative.");
    }

    if (previousQuantity < 0) {
      throw new Error("Previous quantity cannot be negative.");
    }

    if (newQuantity < 0) {
      throw new Error("New quantity cannot be negative.");
    }

    if (unitCost < 0) {
      throw new Error("Unit cost cannot be negative.");
    }

    return InventoryTransaction.create({
      inventoryItem: data.inventoryItem,
      transactionType: data.transactionType,
      quantity,
      previousQuantity,
      newQuantity,
      unitCost,
      totalValue: quantity * unitCost,
      referenceType: data.referenceType || "manual",
      referenceId: data.referenceId || null,
      transactionDate: data.transactionDate || new Date(),
      notes: normalizeOptionalString(data.notes),
    });
  }

  /*
   * ---------------------------------------------------------
   * STOCK IN
   * ---------------------------------------------------------
   */

  async stockIn(id, payload = {}) {
    const quantity = toNumber(payload.quantity, "Stock-in quantity");

    if (quantity <= 0) {
      throw new Error("Stock-in quantity must be greater than zero.");
    }

    const unitCost =
      payload.unitCost !== undefined
        ? toNumber(payload.unitCost, "Unit cost")
        : undefined;

    if (unitCost !== undefined && unitCost < 0) {
      throw new Error("Unit cost cannot be negative.");
    }

    validateReferenceType(payload.referenceType);

    if (payload.referenceId && !mongoose.isValidObjectId(payload.referenceId)) {
      throw new Error("Reference ID must be a valid MongoDB ID.");
    }

    const item = await this.getById(id);

    const previousQuantity = Number(item.quantity) || 0;

    const newQuantity = previousQuantity + quantity;

    item.quantity = newQuantity;
    item.lastRestockedAt = new Date();

    if (unitCost !== undefined) {
      item.unitCost = unitCost;
    }

    await item.save();

    try {
      await this.createTransaction({
        inventoryItem: item._id,
        transactionType: "stock_in",
        quantity,
        previousQuantity,
        newQuantity,
        unitCost:
          unitCost !== undefined ? unitCost : Number(item.unitCost) || 0,
        referenceType: payload.referenceType || "manual",
        referenceId: payload.referenceId || null,
        notes: payload.notes || "",
      });
    } catch (error) {
      item.quantity = previousQuantity;

      await item.save();

      throw error;
    }

    return item;
  }

  /*
   * ---------------------------------------------------------
   * STOCK OUT
   * ---------------------------------------------------------
   */

  async stockOut(id, payload = {}) {
    const quantity = toNumber(payload.quantity, "Stock-out quantity");

    if (quantity <= 0) {
      throw new Error("Stock-out quantity must be greater than zero.");
    }

    validateReferenceType(payload.referenceType);

    if (payload.referenceId && !mongoose.isValidObjectId(payload.referenceId)) {
      throw new Error("Reference ID must be a valid MongoDB ID.");
    }

    const item = await this.getById(id);

    const previousQuantity = Number(item.quantity) || 0;

    if (quantity > previousQuantity) {
      throw new Error(
        `Insufficient inventory quantity. Available quantity is ${previousQuantity}.`,
      );
    }

    const newQuantity = previousQuantity - quantity;

    item.quantity = newQuantity;

    await item.save();

    try {
      await this.createTransaction({
        inventoryItem: item._id,
        transactionType: "stock_out",
        quantity,
        previousQuantity,
        newQuantity,
        unitCost: Number(item.unitCost) || 0,
        referenceType: payload.referenceType || "manual",
        referenceId: payload.referenceId || null,
        notes: payload.notes || "",
      });
    } catch (error) {
      item.quantity = previousQuantity;

      await item.save();

      throw error;
    }

    return item;
  }

  /*
   * ---------------------------------------------------------
   * RETURN
   * ---------------------------------------------------------
   */

  async returnStock(id, payload = {}) {
    const quantity = toNumber(payload.quantity, "Return quantity");

    if (quantity <= 0) {
      throw new Error("Return quantity must be greater than zero.");
    }

    validateReferenceType(payload.referenceType);

    const item = await this.getById(id);

    const previousQuantity = Number(item.quantity) || 0;

    const newQuantity = previousQuantity + quantity;

    item.quantity = newQuantity;
    item.lastRestockedAt = new Date();

    await item.save();

    try {
      await this.createTransaction({
        inventoryItem: item._id,
        transactionType: "return",
        quantity,
        previousQuantity,
        newQuantity,
        unitCost: Number(item.unitCost) || 0,
        referenceType: payload.referenceType || "manual",
        referenceId: payload.referenceId || null,
        notes: payload.notes || "",
      });
    } catch (error) {
      item.quantity = previousQuantity;

      await item.save();

      throw error;
    }

    return item;
  }

  /*
   * ---------------------------------------------------------
   * DAMAGED
   * ---------------------------------------------------------
   */

  async recordDamaged(id, payload = {}) {
    return this.recordLoss({
      id,
      payload,
      transactionType: "damaged",
      label: "Damaged quantity",
    });
  }

  /*
   * ---------------------------------------------------------
   * EXPIRED
   * ---------------------------------------------------------
   */

  async recordExpired(id, payload = {}) {
    return this.recordLoss({
      id,
      payload,
      transactionType: "expired",
      label: "Expired quantity",
    });
  }

  async recordLoss({ id, payload = {}, transactionType, label }) {
    const quantity = toNumber(payload.quantity, label);

    if (quantity <= 0) {
      throw new Error(`${label} must be greater than zero.`);
    }

    const item = await this.getById(id);

    const previousQuantity = Number(item.quantity) || 0;

    if (quantity > previousQuantity) {
      throw new Error(
        `Insufficient inventory quantity. Available quantity is ${previousQuantity}.`,
      );
    }

    const newQuantity = previousQuantity - quantity;

    item.quantity = newQuantity;

    await item.save();

    try {
      await this.createTransaction({
        inventoryItem: item._id,
        transactionType,
        quantity,
        previousQuantity,
        newQuantity,
        unitCost: Number(item.unitCost) || 0,
        referenceType: payload.referenceType || "manual",
        referenceId: payload.referenceId || null,
        notes: payload.notes || "",
      });
    } catch (error) {
      item.quantity = previousQuantity;

      await item.save();

      throw error;
    }

    return item;
  }

  /*
   * ---------------------------------------------------------
   * ADJUSTMENT
   * ---------------------------------------------------------
   */

  async adjustQuantity(id, payload = {}) {
    const quantity = toNumber(payload.quantity, "New inventory quantity");

    if (quantity < 0) {
      throw new Error("Inventory quantity cannot be negative.");
    }

    const item = await this.getById(id);

    const previousQuantity = Number(item.quantity) || 0;

    if (previousQuantity === quantity) {
      return item;
    }

    item.quantity = quantity;

    await item.save();

    try {
      await this.createTransaction({
        inventoryItem: item._id,
        transactionType: "adjustment",
        quantity: Math.abs(previousQuantity - quantity),
        previousQuantity,
        newQuantity: quantity,
        unitCost: Number(item.unitCost) || 0,
        referenceType: "adjustment",
        notes: payload.notes || "Manual inventory quantity adjustment.",
      });
    } catch (error) {
      item.quantity = previousQuantity;

      await item.save();

      throw error;
    }

    return item;
  }

  /*
   * ---------------------------------------------------------
   * GLOBAL TRANSACTION HISTORY
   * ---------------------------------------------------------
   */

  async getAllTransactions(options = {}) {
    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);

    const page = Math.max(Number(options.page) || 1, 1);

    const skip = (page - 1) * limit;

    const query = {};

    if (options.transactionType) {
      validateTransactionType(options.transactionType);

      query.transactionType = options.transactionType;
    }

    if (options.referenceType) {
      validateReferenceType(options.referenceType);

      query.referenceType = options.referenceType;
    }

    if (options.inventoryItem) {
      validateObjectId(options.inventoryItem);

      query.inventoryItem = options.inventoryItem;
    }

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(query)
        .populate({
          path: "inventoryItem",
          select:
            "name category unit quantity reorderLevel unitCost supplier isActive",
        })
        .sort({
          transactionDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      InventoryTransaction.countDocuments(query),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /*
   * ---------------------------------------------------------
   * INDIVIDUAL ITEM HISTORY
   * ---------------------------------------------------------
   */

  async getTransactions(id, options = {}) {
    validateObjectId(id);

    await this.getById(id);

    const page = parsePage(options.page);

    const limit = parsePositiveInteger(options.limit, 50, 200);

    const skip = (page - 1) * limit;

    const filter = {
      inventoryItem: id,
    };

    if (options.transactionType) {
      validateTransactionType(options.transactionType);

      filter.transactionType = options.transactionType;
    }

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .sort({
          transactionDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      InventoryTransaction.countDocuments(filter),
    ]);

    return {
      transactions: transactions.map(buildTransactionView),
      pagination: {
        page,
        limit,
        total,
        pages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  /*
   * ---------------------------------------------------------
   * LOW STOCK
   * ---------------------------------------------------------
   */

  async getLowStockItems() {
    return Inventory.find({
      isActive: true,
      $expr: {
        $and: [
          {
            $lte: ["$quantity", "$reorderLevel"],
          },
          {
            $gt: ["$quantity", 0],
          },
        ],
      },
    }).sort({
      quantity: 1,
      name: 1,
    });
  }

  /*
   * ---------------------------------------------------------
   * STOCKOUTS
   * ---------------------------------------------------------
   */

  async getStockoutItems() {
    return Inventory.find({
      isActive: true,
      quantity: 0,
    }).sort({
      name: 1,
    });
  }

  /*
   * ---------------------------------------------------------
   * SUMMARY
   * ---------------------------------------------------------
   */

  async getInventorySummary() {
    const [summary, categories] = await Promise.all([
      Inventory.aggregate([
        {
          $match: {
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,

            totalItems: {
              $sum: 1,
            },

            totalValue: {
              $sum: {
                $multiply: ["$quantity", "$unitCost"],
              },
            },

            lowStockItems: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $lte: ["$quantity", "$reorderLevel"],
                      },
                      {
                        $gt: ["$quantity", 0],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            stockoutItems: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$quantity", 0],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      Inventory.aggregate([
        {
          $match: {
            isActive: true,
          },
        },
        {
          $group: {
            _id: "$category",

            items: {
              $sum: 1,
            },

            quantity: {
              $sum: "$quantity",
            },

            value: {
              $sum: {
                $multiply: ["$quantity", "$unitCost"],
              },
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),
    ]);

    const categoryMap = {};

    categories.forEach((category) => {
      categoryMap[category._id] = {
        items: category.items,
        quantity: category.quantity,
        value: category.value,
      };
    });

    return {
      totalItems: summary[0]?.totalItems || 0,

      totalValue: summary[0]?.totalValue || 0,

      lowStockItems: summary[0]?.lowStockItems || 0,

      stockoutItems: summary[0]?.stockoutItems || 0,

      categories: categoryMap,
    };
  }
}

module.exports = new InventoryService();
