const {
  validationResult,
} = require("express-validator");

const asyncHandler = require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

const supplierService =
  require("../services/supplierService");

const getMetadata = (req) => ({
  ipAddress:
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "",

  userAgent:
    req.get("user-agent") || "",
});

const validate = (
  req,
  res,
) => {
  const errors =
    validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,

      message:
        "Please correct the highlighted fields.",

      errors:
        errors.array().map(
          (error) => ({
            field:
              error.path,

            message:
              error.msg,
          }),
        ),
    });

    return false;
  }

  return true;
};

const createSupplier =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const supplier =
        await supplierService.createSupplier(
          {
            data: req.body,

            ...getMetadata(req),
          },
        );

      return successResponse(
        res,
        {
          statusCode: 201,

          message:
            "Supplier created successfully.",

          data: {
            supplier,
          },
        },
      );
    },
  );

const listSuppliers =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await supplierService.listSuppliers(
          {
            status:
              req.query.status,

            search:
              req.query.search,

            page:
              req.query.page,

            limit:
              req.query.limit,
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Suppliers retrieved successfully.",

          data: result,
        },
      );
    },
  );

const getSupplier =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const supplier =
        await supplierService.getSupplierById(
          req.params.id,
        );

      if (!supplier) {
        return errorResponse(
          res,
          {
            statusCode: 404,

            message:
              "Supplier not found.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Supplier retrieved successfully.",

          data: {
            supplier,
          },
        },
      );
    },
  );

const updateSupplier =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await supplierService.updateSupplier(
          {
            id:
              req.params.id,

            data:
              req.body,

            ...getMetadata(req),
          },
        );

      if (!result.success) {
        return errorResponse(
          res,
          {
            statusCode: 404,

            message:
              "Supplier not found.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Supplier updated successfully.",

          data: {
            supplier:
              result.supplier,
          },
        },
      );
    },
  );

const deleteSupplier =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await supplierService.deleteSupplier(
          {
            id:
              req.params.id,

            ...getMetadata(req),
          },
        );

      if (!result.success) {
        return errorResponse(
          res,
          {
            statusCode: 404,

            message:
              "Supplier not found.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Supplier deleted successfully.",
        },
      );
    },
  );

module.exports = {
  createSupplier,
  listSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
};