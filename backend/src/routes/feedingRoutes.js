const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const feedingController = require("../controllers/feedingController");

const {
  createFeedingValidators,
  updateFeedingValidators,
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

/**
 * PATCH /api/feedings/:id
 */
router.patch(
  "/:id",
  feedingIdValidators,
  updateFeedingValidators,
  feedingController.updateFeeding,
);

/**
 * DELETE /api/feedings/:id
 */
router.delete("/:id", feedingIdValidators, feedingController.deleteFeeding);

module.exports = router;
