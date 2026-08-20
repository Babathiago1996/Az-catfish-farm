const mongoose = require("mongoose");

const Gallery = require("../models/Gallery");
const cloudinary = require("../config/cloudinary");
const ActivityLog = require("../models/ActivityLog");

const REPORT_TIME_ZONE = "Africa/Lagos";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const uploadBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "az-fish-farm/gallery",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
};

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
};

const normalizePagination = ({
  page,
  limit,
} = {}) => {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  const normalizedPage =
    Number.isInteger(parsedPage) && parsedPage > 0
      ? parsedPage
      : DEFAULT_PAGE;

  const normalizedLimit =
    Number.isInteger(parsedLimit) &&
    parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  };
};

const buildGalleryData = (item) => {
  if (!item) {
    return null;
  }

  return {
    _id: item._id,
    title: item.title,
    description: item.description || "",
    category: item.category,
    imageUrl: item.imageUrl,
    cloudinaryPublicId:
      item.cloudinaryPublicId,
    cloudinaryResourceType:
      item.cloudinaryResourceType || "image",
    format: item.format || "",
    width: Number(item.width || 0),
    height: Number(item.height || 0),
    bytes: Number(item.bytes || 0),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    timeZone: REPORT_TIME_ZONE,
  };
};

const createGallery = async ({
  title,
  description = "",
  category,
  file,
} = {}) => {
  if (!file || !file.buffer) {
    const error = new Error(
      "Gallery image is required.",
    );

    error.code = "IMAGE_REQUIRED";

    throw error;
  }

  const uploadResult =
    await uploadBufferToCloudinary(file.buffer);

  if (!uploadResult?.secure_url) {
    const error = new Error(
      "Image upload failed.",
    );

    error.code = "CLOUDINARY_UPLOAD_FAILED";

    throw error;
  }

  let gallery;

  try {
    gallery = await Gallery.create({
      title,
      description,
      category,
      imageUrl: uploadResult.secure_url,
      cloudinaryPublicId:
        uploadResult.public_id,
      cloudinaryResourceType:
        uploadResult.resource_type || "image",
      format: uploadResult.format || "",
      width: Number(uploadResult.width || 0),
      height: Number(uploadResult.height || 0),
      bytes: Number(uploadResult.bytes || 0),
    });
  } catch (error) {
    try {
      await deleteCloudinaryImage(
        uploadResult.public_id,
      );
    } catch (cleanupError) {
      console.error(
        "Cloudinary cleanup failed after database error:",
        cleanupError,
      );
    }

    throw error;
  }

  try {
    await ActivityLog.create({
      action: "create",
      entityType: "Gallery",
      entityId: gallery._id,
      description: `Gallery image "${gallery.title}" was uploaded.`,
      metadata: {
        title: gallery.title,
        category: gallery.category,
        cloudinaryPublicId:
          gallery.cloudinaryPublicId,
      },
    });
  } catch (error) {
    console.error(
      "Gallery activity log failed:",
      error,
    );
  }

  return buildGalleryData(gallery);
};

const getGalleryById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(
      "Gallery item not found.",
    );

    error.code = "GALLERY_NOT_FOUND";

    throw error;
  }

  const gallery = await Gallery.findById(id).lean();

  if (!gallery) {
    const error = new Error(
      "Gallery item not found.",
    );

    error.code = "GALLERY_NOT_FOUND";

    throw error;
  }

  return buildGalleryData(gallery);
};

const getAllGallery = async ({
  page,
  limit,
  category,
} = {}) => {
  const pagination = normalizePagination({
    page,
    limit,
  });

  const filter = {};

  if (category) {
    filter.category = category;
  }

  const skip =
    (pagination.page - 1) *
    pagination.limit;

  const [items, total] = await Promise.all([
    Gallery.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(pagination.limit)
      .lean(),

    Gallery.countDocuments(filter),
  ]);

  return {
    galleries: items.map(buildGalleryData),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages:
        total > 0
          ? Math.ceil(
              total / pagination.limit,
            )
          : 0,
    },
  };
};

const updateGallery = async (
  id,
  {
    title,
    description,
    category,
  } = {},
) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(
      "Gallery item not found.",
    );

    error.code = "GALLERY_NOT_FOUND";

    throw error;
  }

  const gallery = await Gallery.findById(id);

  if (!gallery) {
    const error = new Error(
      "Gallery item not found.",
    );

    error.code = "GALLERY_NOT_FOUND";

    throw error;
  }

  if (title !== undefined) {
    gallery.title = title;
  }

  if (description !== undefined) {
    gallery.description = description;
  }

  if (category !== undefined) {
    gallery.category = category;
  }

  await gallery.save();

  try {
    await ActivityLog.create({
      action: "update",
      entityType: "Gallery",
      entityId: gallery._id,
      description: `Gallery image "${gallery.title}" was updated.`,
      metadata: {
        title: gallery.title,
        category: gallery.category,
      },
    });
  } catch (error) {
    console.error(
      "Gallery activity log failed:",
      error,
    );
  }

  return buildGalleryData(gallery);
};

const deleteGallery = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(
      "Gallery item not found.",
    );

    error.code = "GALLERY_NOT_FOUND";

    throw error;
  }

  const gallery = await Gallery.findById(id);

  if (!gallery) {
    const error = new Error(
      "Gallery item not found.",
    );

    error.code = "GALLERY_NOT_FOUND";

    throw error;
  }

  const cloudinaryPublicId =
    gallery.cloudinaryPublicId;

  await deleteCloudinaryImage(
    cloudinaryPublicId,
  );

  await gallery.deleteOne();

  try {
    await ActivityLog.create({
      action: "delete",
      entityType: "Gallery",
      entityId: gallery._id,
      description: `Gallery image "${gallery.title}" was deleted.`,
      metadata: {
        title: gallery.title,
        category: gallery.category,
        cloudinaryPublicId,
      },
    });
  } catch (error) {
    console.error(
      "Gallery activity log failed:",
      error,
    );
  }

  return {
    _id: gallery._id,
    title: gallery.title,
    imageUrl: gallery.imageUrl,
    category: gallery.category,
    timeZone: REPORT_TIME_ZONE,
  };
};

module.exports = {
  createGallery,
  getGalleryById,
  getAllGallery,
  updateGallery,
  deleteGallery,
  uploadBufferToCloudinary,
  deleteCloudinaryImage,
};