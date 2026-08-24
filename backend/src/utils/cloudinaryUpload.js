const cloudinary = require("../config/cloudinary");

/**
 * Upload an image buffer to Cloudinary.
 *
 * @param {Buffer} buffer
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const uploadImageBuffer = (
  buffer,
  options = {},
) => {
  return new Promise((resolve, reject) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      return reject(
        new Error(
          "A valid image buffer is required.",
        ),
      );
    }

    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder:
            options.folder ||
            "az-fish-farm/mortality",

          resource_type: "image",

          transformation: [
            {
              width: 1600,
              height: 1600,
              crop: "limit",
              quality: "auto",
              fetch_format: "auto",
            },
          ],

          use_filename: true,
          unique_filename: true,
        },

        (error, result) => {
          if (error) {
            return reject(error);
          }

          if (!result) {
            return reject(
              new Error(
                "Cloudinary returned no upload result.",
              ),
            );
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

    uploadStream.end(buffer);
  });
};

/**
 * Delete an image from Cloudinary.
 *
 * Failure is intentionally handled by the caller.
 */
const deleteCloudinaryImage = async (
  publicId,
) => {
  if (!publicId) {
    return null;
  }

  return cloudinary.uploader.destroy(
    publicId,
    {
      resource_type: "image",
    },
  );
};

module.exports = {
  uploadImageBuffer,
  deleteCloudinaryImage,
};