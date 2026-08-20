const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const env = require("./config/env");

const authRoutes = require("./routes/authRoutes");
const pondRoutes = require("./routes/pondRoutes");
const stockingRoutes = require("./routes/stockingRoutes");
const feedingRoutes = require("./routes/feedingRoutes");
const waterManagementRoutes = require("./routes/waterManagementRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const growthRoutes = require("./routes/growthRoutes");
const mortalityRoutes = require("./routes/mortalityRoutes");
const saleRoutes = require("./routes/saleRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const customerRoutes = require("./routes/customerRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const reportRoutes = require("./routes/reportRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const publicWebsiteRoutes = require("./routes/publicWebsiteRoutes");
const dailyActivityRoutes = require("./routes/dailyActivityRoutes");

const notFoundMiddleware = require("./middleware/notFoundMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.disable("x-powered-by");

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = env.clientUrl
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("The request origin is not allowed by CORS."));
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests from this IP. Please try again later.",
  },
});

app.use(generalRateLimiter);

app.use(
  express.json({
    limit: "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  }),
);

app.use(compression());

if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
}

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AZ Fish Farm API is healthy.",
    data: {
      service: "az-fish-farm-api",
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
    },
  });
});

app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the AZ Fish Farm Management API.",
    data: {
      version: "1.0.0",
    },
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/ponds", pondRoutes);

app.use("/api/stocking", stockingRoutes);
app.use("/api/growth", growthRoutes);
app.use("/api/mortality", mortalityRoutes);

app.use("/api/daily-activities", dailyActivityRoutes);

app.use("/api/feeding", feedingRoutes);

app.use("/api/water-management", waterManagementRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/public", publicWebsiteRoutes);
app.use("/api/daily-activities", dailyActivityRoutes);
app.use(notFoundMiddleware);

app.use(errorMiddleware);

module.exports = app;
