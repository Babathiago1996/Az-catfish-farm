const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const feedingController = require("../controllers/feedingController");

const {
  createFeedingValidators,
  feedingIdValidators,
  listFeedingValidators,
} = require("../validators/feedingValidators");

const router = express.Router();

router.use(protect);

/**
 * GET /api/feedings/today
 */
router.get("/today", feedingController.getTodayConsumption);

/**
 * GET /api/feedings
 */
router.get("/", listFeedingValidators, feedingController.listFeedings);

/**
 * POST /api/feedings
 */
router.post("/", createFeedingValidators, feedingController.createFeeding);

/**
 * GET /api/feedings/:id
 */
router.get("/:id", feedingIdValidators, feedingController.getFeeding);

module.exports = router;
