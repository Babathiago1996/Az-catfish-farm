const {
  validationResult
} = require("express-validator");

const asyncHandler = require("../utils/asyncHandler");

const {
  errorResponse
} = require("../utils/apiResponse");

const {
  getInvoiceData,
  generateInvoiceHtml
} = require("../services/invoiceService");

const validate = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,
      message:
        "Invalid invoice request.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg
      }))
    });

    return false;
  }

  return true;
};

const getPrintableInvoice =
  asyncHandler(async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const data =
      await getInvoiceData(
        req.params.id
      );

    if (!data) {
      return errorResponse(res, {
        statusCode: 404,
        message:
          "Sale not found."
      });
    }

    const html =
      generateInvoiceHtml(data);

    res
      .status(200)
      .type("html")
      .send(html);
  });

module.exports = {
  getPrintableInvoice
};