const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const controller = require("../controllers/mortalityController");

const {
  createMortalityValidators,
  updateMortalityValidators,
  mortalityIdValidators,
  listMortalityValidators,
  mortalitySummaryValidators,
} = require("../validators/mortalityValidators");

const router = express.Router();

router.use(protect);

/*
 * SUMMARY
 *
 * GET /api/mortality/summary
 */
router.get(
  "/summary",
  mortalitySummaryValidators,
  controller.getMortalitySummary,
);

/*
 * LIST
 *
 * GET /api/mortality
 */
router.get("/", listMortalityValidators, controller.listMortality);

/*
 * CREATE
 *
 * POST /api/mortality
 *
 * multipart/form-data
 *
 * image field (up to 5 files):
 * images
 */
router.post(
  "/",
  upload.array("images", 5),
  createMortalityValidators,
  controller.createMortality,
);

/*
 * GET ONE
 */
router.get("/:id", mortalityIdValidators, controller.getMortality);

/*
 * UPDATE
 *
 * PATCH /api/mortality/:id
 *
 * multipart/form-data
 *
 * image field (up to 5 files):
 * images
 */
router.patch(
  "/:id",
  upload.array("images", 5),
  updateMortalityValidators,
  controller.updateMortality,
);

/*
 * DELETE
 *
 * DELETE /api/mortality/:id
 *
 * Permanently removes the record from MongoDB (not a
 * soft delete), and cleans up any Cloudinary images and
 * pond fish-count adjustments it made.
 */
router.delete("/:id", mortalityIdValidators, controller.deleteMortality);

module.exports = router;