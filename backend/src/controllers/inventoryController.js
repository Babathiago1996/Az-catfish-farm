const { validationResult } = require("express-validator");

const asyncHandler = require("../utils/asyncHandler");

const { successResponse, errorResponse } = require("../utils/apiResponse");

const inventoryService = require("../services/inventoryService");

const validateRequest = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,
      message: "Validation failed.",
      errors: errors.array(),
    });

    return false;
  }

  return true;
};

const getErrorStatusCode = (error) => {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("not found") ||
    message.includes("invalid inventory id") ||
    message.includes("invalid inventory item id") ||
    message.includes("invalid reference id")
  ) {
    return 404;
  }

  if (message.includes("already exists") || message.includes("already uses")) {
    return 409;
  }

  if (
    message.includes("insufficient") ||
    message.includes("cannot") ||
    message.includes("must be") ||
    message.includes("invalid") ||
    message.includes("greater than")
  ) {
    return 400;
  }

  return 500;
};

const handleServiceError = (res, error) => {
  return errorResponse(res, {
    statusCode: getErrorStatusCode(error),
    message: error?.message || "Unable to complete inventory operation.",
  });
};

/*
 * ---------------------------------------------------------
 * INVENTORY ITEMS
 * ---------------------------------------------------------
 */

exports.createInventory = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  try {
    const item = await inventoryService.createItem(req.body);

    return successResponse(res, {
      statusCode: 201,
      message: "Inventory item created successfully.",
      data: item,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

exports.getInventory = asyncHandler(async (req, res) => {
  try {
    const items = await inventoryService.getAll(req.query);

    return successResponse(res, {
      message: "Inventory retrieved successfully.",
      data: items,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

exports.getInventoryItem = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  try {
    const item = await inventoryService.getById(req.params.id);

    return successResponse(res, {
      message: "Inventory item retrieved successfully.",
      data: item,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

exports.updateInventory = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  try {
    const item = await inventoryService.updateItem(req.params.id, req.body);

    return successResponse(res, {
      message: "Inventory item updated successfully.",
      data: item,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

exports.deleteInventory = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  try {
    const item = await inventoryService.deleteItem(req.params.id);

    return successResponse(res, {
      message:
        "Inventory item deactivated successfully. Transaction history has been retained.",
      data: item,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

/*
 * ---------------------------------------------------------
 * STOCK OPERATIONS
 * ---------------------------------------------------------
 */

exports.stockIn = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  try {
    const item = await inventoryService.stockIn(req.params.id, req.body);

    return successResponse(res, {
      message: "Inventory stock added successfully.",
      data: item,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

exports.stockOut = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  try {
    const item = await inventoryService.stockOut(req.params.id, req.body);

    return successResponse(res, {
      message: "Inventory stock deducted successfully.",
      data: item,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

exports.returnStock = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  try {
    const item = await inventoryService.returnStock(req.params.id, req.body);

    return successResponse(res, {
      message: "Inventory return recorded successfully.",
      data: item,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

exports.recordDamaged = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  try {
    const item = await inventoryService.recordDamaged(req.params.id, req.body);

    return successResponse(res, {
      message: "Damaged inventory recorded successfully.",
      data: item,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

exports.recordExpired = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  try {
    const item = await inventoryService.recordExpired(req.params.id, req.body);

    return successResponse(res, {
      message: "Expired inventory recorded successfully.",
      data: item,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

exports.adjustQuantity = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  try {
    const item = await inventoryService.adjustQuantity(req.params.id, req.body);

    return successResponse(res, {
      message: "Inventory quantity adjusted successfully.",
      data: item,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

/*
 * ---------------------------------------------------------
 * SUMMARY / STOCK STATUS
 * ---------------------------------------------------------
 */

exports.getLowStock = asyncHandler(async (req, res) => {
  try {
    const items = await inventoryService.getLowStockItems();

    return successResponse(res, {
      message: "Low-stock inventory retrieved successfully.",
      data: items,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

exports.getStockouts = asyncHandler(async (req, res) => {
  try {
    const items = await inventoryService.getStockoutItems();

    return successResponse(res, {
      message: "Stockout inventory retrieved successfully.",
      data: items,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

exports.getSummary = asyncHandler(async (req, res) => {
  try {
    const summary = await inventoryService.getInventorySummary();

    return successResponse(res, {
      message: "Inventory summary retrieved successfully.",
      data: summary,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

/*
 * ---------------------------------------------------------
 * TRANSACTION HISTORY
 * ---------------------------------------------------------
 */

exports.getAllTransactions = asyncHandler(async (req, res) => {
  try {
    const result = await inventoryService.getAllTransactions(req.query);

    return successResponse(res, {
      message: "Inventory transaction history retrieved successfully.",

      data: result.transactions,

      meta: result.pagination,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});
exports.getTransactions = asyncHandler(async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  try {
    const result = await inventoryService.getTransactions(
      req.params.id,
      req.query,
    );

    return successResponse(res, {
      message: "Inventory item transaction history retrieved successfully.",
      data: result.transactions,
      meta: result.pagination,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});
