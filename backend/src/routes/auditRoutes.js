const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const controller = require("../controllers/auditController");

const { auditYearValidators } = require("../validators/auditValidators");

const router = express.Router();

router.use(protect);

router.get("/overview", controller.getOverview);

router.get("/years", controller.getYears);

router.get("/:year", auditYearValidators, controller.getYearAudit);

module.exports = router;
