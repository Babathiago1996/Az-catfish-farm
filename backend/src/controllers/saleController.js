const { validationResult } = require("express-validator");

const saleService = require("../services/saleService");
const asyncHandler = require("../utils/asyncHandler");

const { successResponse, errorResponse } = require("../utils/apiResponse");

const getMetadata = (req) => ({
  ipAddress:
    req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",

  userAgent: req.get("user-agent") || "",
});

const validate = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,
      message: "Please correct the highlighted fields.",

      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });

    return false;
  }

  return true;
};

const createSale = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await saleService.createSale({
    data: req.body,
    ...getMetadata(req),
  });

  if (!result.success) {
    if (result.reason === "POND_NOT_FOUND") {
      return errorResponse(res, {
        statusCode: 404,
        message: "The selected pond was not found.",
      });
    }

    if (result.reason === "QUANTITY_EXCEEDS_STOCK") {
      return errorResponse(res, {
        statusCode: 400,
        message:
          "The quantity sold exceeds the current fish count in the selected pond.",
      });
    }

    if (result.reason === "PAYMENT_EXCEEDS_TOTAL") {
      return errorResponse(res, {
        statusCode: 400,
        message: "Amount paid cannot exceed the total sale amount.",
      });
    }

    if (result.reason === "CANNOT_CANCEL_PAID_SALE") {
      return errorResponse(res, {
        statusCode: 400,
        message:
          "A sale with payment received cannot be cancelled until the payment is handled.",
      });
    }
  }

  return successResponse(res, {
    statusCode: 201,
    message: "Sale recorded successfully.",
    data: {
      sale: result.sale,
    },
  });
});

const listSales = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await saleService.listSales({
    pond: req.query.pond,
    paymentStatus: req.query.paymentStatus,
    from: req.query.from,
    to: req.query.to,
    search: req.query.search,
    page: req.query.page,
    limit: req.query.limit,
  });

  return successResponse(res, {
    statusCode: 200,
    message: "Sales retrieved successfully.",
    data: result,
  });
});

const getSale = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const sale = await saleService.getSaleById(req.params.id);

  if (!sale) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Sale not found.",
    });
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Sale retrieved successfully.",
    data: {
      sale,
    },
  });
});

const updateSale = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await saleService.updateSale({
    id: req.params.id,
    data: req.body,
    ...getMetadata(req),
  });

  if (!result.success) {
    if (result.reason === "NOT_FOUND") {
      return errorResponse(res, {
        statusCode: 404,
        message: "Sale not found.",
      });
    }

    if (result.reason === "POND_NOT_FOUND") {
      return errorResponse(res, {
        statusCode: 404,
        message: "The selected pond was not found.",
      });
    }

    if (result.reason === "QUANTITY_EXCEEDS_STOCK") {
      return errorResponse(res, {
        statusCode: 400,
        message: "The updated quantity exceeds the available fish stock.",
      });
    }

    if (result.reason === "PAYMENT_EXCEEDS_TOTAL") {
      return errorResponse(res, {
        statusCode: 400,
        message: "Amount paid cannot exceed the updated sale amount.",
      });
    }

    if (result.reason === "CANNOT_CANCEL_PAID_SALE") {
      return errorResponse(res, {
        statusCode: 400,
        message:
          "A sale with payment received cannot be cancelled until the payment is handled.",
      });
    }
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Sale updated successfully.",
    data: {
      sale: result.sale,
    },
  });
});

const deleteSale = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const result = await saleService.deleteSale({
    id: req.params.id,
    ...getMetadata(req),
  });

  if (!result.success) {
    if (result.reason === "NOT_FOUND") {
      return errorResponse(res, {
        statusCode: 404,
        message: "Sale not found.",
      });
    }
  }

  return successResponse(res, {
    statusCode: 200,
    message: "Sale deleted and pond stock restored.",
    data: {
      sale: result.sale,
    },
  });
});

const getSalesSummary = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const summary = await saleService.getSalesSummary({
    from: req.query.from,
    to: req.query.to,
    pond: req.query.pond,
  });

  return successResponse(res, {
    statusCode: 200,
    message: "Sales summary retrieved successfully.",
    data: {
      summary,
    },
  });
});

module.exports = {
  createSale,
  listSales,
  getSale,
  updateSale,
  deleteSale,
  getSalesSummary,
};
