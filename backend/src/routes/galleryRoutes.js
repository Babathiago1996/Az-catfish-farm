const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const controller =
  require("../controllers/galleryController");

const {
  createGalleryValidator,
  updateGalleryValidator,
  galleryIdValidator,
  listGalleryValidator,
} = require("../validators/galleryValidators");

const router = express.Router();

router.use(protect);

router.get(
  "/",
  listGalleryValidator,
  controller.getAllGallery,
);

router.get(
  "/:id",
  galleryIdValidator,
  controller.getGalleryById,
);

router.post(
  "/",
  upload.single("image"),
  createGalleryValidator,
  controller.createGallery,
);

router.patch(
  "/:id",
  updateGalleryValidator,
  controller.updateGallery,
);

router.delete(
  "/:id",
  galleryIdValidator,
  controller.deleteGallery,
);

module.exports = router;