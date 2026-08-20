const express = require("express");

const {
  protect
} = require("../middleware/authMiddleware");

const pondController = require("../controllers/pondController");

const {
  createPondValidators,
  updatePondValidators,
  pondIdValidators,
  listPondValidators
} = require("../validators/pondValidators");

const router = express.Router();

router.use(protect);

router.get(
  "/",
  listPondValidators,
  pondController.listPonds
);

router.post(
  "/",
  createPondValidators,
  pondController.createPond
);

router.get(
  "/:id",
  pondIdValidators,
  pondController.getPond
);

router.patch(
  "/:id",
  updatePondValidators,
  pondController.updatePond
);

router.delete(
  "/:id",
  pondIdValidators,
  pondController.deletePond
);

module.exports = router;