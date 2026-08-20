const {
  validationResult,
} = require("express-validator");

const asyncHandler = require("../utils/asyncHandler");

const {
  successResponse,
  errorResponse,
} = require("../utils/apiResponse");

const galleryService = require("../services/galleryService");

const validate = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    errorResponse(res, {
      statusCode: 422,
      message:
        "Please correct the highlighted fields.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });

    return false;
  }

  return true;
};

const createGallery = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const gallery =
      await galleryService.createGallery({
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        file: req.file,
      });

    return successResponse(res, {
      statusCode: 201,
      message:
        "Gallery image uploaded successfully.",
      data: {
        gallery,
      },
    });
  },
);

const getGalleryById = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const gallery =
      await galleryService.getGalleryById(
        req.params.id,
      );

    return successResponse(res, {
      statusCode: 200,
      message:
        "Gallery image retrieved successfully.",
      data: {
        gallery,
      },
    });
  },
);

const getAllGallery = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const result =
      await galleryService.getAllGallery({
        page: req.query.page,
        limit: req.query.limit,
        category: req.query.category,
      });

    return successResponse(res, {
      statusCode: 200,
      message:
        "Gallery images retrieved successfully.",
      data: result,
    });
  },
);

const updateGallery = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const gallery =
      await galleryService.updateGallery(
        req.params.id,
        {
          title: req.body.title,
          description:
            req.body.description,
          category: req.body.category,
        },
      );

    return successResponse(res, {
      statusCode: 200,
      message:
        "Gallery image updated successfully.",
      data: {
        gallery,
      },
    });
  },
);

const deleteGallery = asyncHandler(
  async (req, res) => {
    if (!validate(req, res)) {
      return;
    }

    const gallery =
      await galleryService.deleteGallery(
        req.params.id,
      );

    return successResponse(res, {
      statusCode: 200,
      message:
        "Gallery image deleted successfully.",
      data: {
        gallery,
      },
    });
  },
);

module.exports = {
  createGallery,
  getGalleryById,
  getAllGallery,
  updateGallery,
  deleteGallery,
};