const {
  validationResult,
} = require("express-validator");

const asyncHandler =
  require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

const customerService =
  require("../services/customerService");

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

const createCustomer =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await customerService.createCustomer(
          {
            data: req.body,

            ...getMetadata(req),
          },
        );

      if (!result.success) {
        if (
          result.reason ===
          "DUPLICATE_PHONE"
        ) {
          return errorResponse(
            res,
            {
              statusCode: 409,

              message:
                "A customer with this phone number already exists.",
            },
          );
        }

        if (
          result.reason ===
          "DUPLICATE_EMAIL"
        ) {
          return errorResponse(
            res,
            {
              statusCode: 409,

              message:
                "A customer with this email already exists.",
            },
          );
        }
      }

      return successResponse(
        res,
        {
          statusCode: 201,

          message:
            "Customer created successfully.",

          data: {
            customer:
              result.customer,
          },
        },
      );
    },
  );

const listCustomers =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await customerService.listCustomers(
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
            "Customers retrieved successfully.",

          data: result,
        },
      );
    },
  );

const getCustomer =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const customer =
        await customerService.getCustomerById(
          req.params.id,
        );

      if (!customer) {
        return errorResponse(
          res,
          {
            statusCode: 404,

            message:
              "Customer not found.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Customer retrieved successfully.",

          data: {
            customer,
          },
        },
      );
    },
  );

const updateCustomer =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await customerService.updateCustomer(
          {
            id:
              req.params.id,

            data:
              req.body,

            ...getMetadata(req),
          },
        );

      if (!result.success) {
        if (
          result.reason ===
          "NOT_FOUND"
        ) {
          return errorResponse(
            res,
            {
              statusCode: 404,

              message:
                "Customer not found.",
            },
          );
        }

        if (
          result.reason ===
          "DUPLICATE_PHONE"
        ) {
          return errorResponse(
            res,
            {
              statusCode: 409,

              message:
                "A customer with this phone number already exists.",
            },
          );
        }

        if (
          result.reason ===
          "DUPLICATE_EMAIL"
        ) {
          return errorResponse(
            res,
            {
              statusCode: 409,

              message:
                "A customer with this email already exists.",
            },
          );
        }
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Customer updated successfully.",

          data: {
            customer:
              result.customer,
          },
        },
      );
    },
  );

const deleteCustomer =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const result =
        await customerService.deleteCustomer(
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
              "Customer not found.",
          },
        );
      }

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Customer deactivated successfully.",
        },
      );
    },
  );

const getCustomerSummary =
  asyncHandler(
    async (req, res) => {
      if (!validate(req, res)) {
        return;
      }

      const summary =
        await customerService.getCustomerSummary(
          {
            status:
              req.query.status,
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Customer summary retrieved successfully.",

          data: {
            summary,
          },
        },
      );
    },
  );

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerSummary,
};