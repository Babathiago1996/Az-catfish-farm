const { validationResult } = require("express-validator");

const asyncHandler = require("../utils/asyncHandler");

const { successResponse, errorResponse } = require("../utils/apiResponse");

const auditService = require("../services/auditService");

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

/**
 * GET /api/audit/overview
 *
 * Lifetime totals + a year-by-year trend so the Audit
 * menu can open straight onto "how has the farm done,
 * year over year" before drilling into any single year.
 */
const getOverview = asyncHandler(async (req, res) => {
  const overview = await auditService.getAuditOverview();

  return successResponse(res, {
    statusCode: 200,
    message: "Audit overview retrieved successfully.",
    data: {
      overview,
    },
  });
});

/**
 * GET /api/audit/years
 *
 * The list of years the audit screen should let the
 * user page through (always includes the current year).
 */
const getYears = asyncHandler(async (req, res) => {
  const years = await auditService.getAuditYears();

  return successResponse(res, {
    statusCode: 200,
    message: "Audit years retrieved successfully.",
    data: {
      years,
      currentYear: auditService.getCurrentLagosYear(),
    },
  });
});

/**
 * GET /api/audit/:year
 *
 * Full audit for one calendar year: stocking cost,
 * expenses, mortality loss, sales and net profit, with
 * the underlying ledger of records behind each figure.
 */
const getYearAudit = asyncHandler(async (req, res) => {
  if (!validate(req, res)) {
    return;
  }

  const audit = await auditService.getYearlyAudit(req.params.year);

  return successResponse(res, {
    statusCode: 200,
    message: `Audit for ${req.params.year} retrieved successfully.`,
    data: {
      audit,
    },
  });
});

module.exports = {
  getOverview,
  getYears,
  getYearAudit,
};
