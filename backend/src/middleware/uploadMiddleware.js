const multer = require("multer");

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return callback(
      new Error(
        "Only JPEG, PNG, WebP, and GIF images are allowed.",
      ),
      false,
    );
  }

  callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

module.exports = upload;