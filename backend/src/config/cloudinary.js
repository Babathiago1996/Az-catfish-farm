const cloudinary = require("cloudinary").v2;

const requiredEnvironmentVariables = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missingEnvironmentVariables =
  requiredEnvironmentVariables.filter(
    (key) => !process.env[key],
  );

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing Cloudinary environment variables: ${missingEnvironmentVariables.join(
      ", ",
    )}`,
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;