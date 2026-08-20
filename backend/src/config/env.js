
const dotenv = require("dotenv");

dotenv.config();

const requiredEnvironmentVariables = [
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_RESET_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD"
];

const missingEnvironmentVariables =
  requiredEnvironmentVariables.filter(
    (variableName) =>
      !process.env[variableName] ||
      !process.env[variableName].trim()
  );

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvironmentVariables.join(
      ", "
    )}`
  );
}

const parseBoolean = (
  value,
  defaultValue = false
) => {
  if (typeof value === "undefined") {
    return defaultValue;
  }

  return (
    String(value).toLowerCase() === "true"
  );
};

const parseNumber = (
  value,
  defaultValue
) => {
  if (
    typeof value === "undefined" ||
    value === ""
  ) {
    return defaultValue;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : defaultValue;
};

const env = Object.freeze({
  nodeEnv:
    process.env.NODE_ENV ||
    "development",

  port: parseNumber(
    process.env.PORT,
    5000
  ),

  clientUrl:
    process.env.CLIENT_URL ||
    "http://localhost:3000",

  mongodbUri:
    process.env.MONGODB_URI,

  jwtSecret:
    process.env.JWT_SECRET,

  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN ||
    "7d",

  jwtResetSecret:
    process.env.JWT_RESET_SECRET,

  jwtResetExpiresIn:
    process.env.JWT_RESET_EXPIRES_IN ||
    "15m",

  adminEmail:
    process.env.ADMIN_EMAIL
      .toLowerCase()
      .trim(),

  adminPassword:
    process.env.ADMIN_PASSWORD,

  smtp: {
    host:
      process.env.SMTP_HOST ||
      "",

    port: parseNumber(
      process.env.SMTP_PORT,
      587
    ),

    secure: parseBoolean(
      process.env.SMTP_SECURE,
      false
    ),

    user:
      process.env.SMTP_USER ||
      "",

    password:
      process.env.SMTP_PASSWORD ||
      "",

    fromName:
      process.env.SMTP_FROM_NAME ||
      "AZ Fish Farm",

    fromEmail:
      process.env.SMTP_FROM_EMAIL ||
      ""
  },

  cloudinary: {
    cloudName:
      process.env
        .CLOUDINARY_CLOUD_NAME ||
      "",

    apiKey:
      process.env
        .CLOUDINARY_API_KEY ||
      "",

    apiSecret:
      process.env
        .CLOUDINARY_API_SECRET ||
      ""
  },

  waterChangeIntervalDays:
    parseNumber(
      process.env
        .WATER_CHANGE_INTERVAL_DAYS,
      7
    ),

  lowFeedThreshold:
    parseNumber(
      process.env
        .LOW_FEED_THRESHOLD,
      10
    ),

  lowInventoryThreshold:
    parseNumber(
      process.env
        .LOW_INVENTORY_THRESHOLD,
      5
    ),

  cronTimezone:
    process.env.CRON_TIMEZONE ||
    "Africa/Lagos",

  logLevel:
    process.env.LOG_LEVEL ||
    "info"
});

module.exports = env;

