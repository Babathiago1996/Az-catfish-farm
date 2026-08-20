const http = require("http");

const app = require("./app");
const env = require("./config/env");

const { connectDatabase, disconnectDatabase } = require("./config/database");

const {
  startMaintenanceReminderJob,
} = require("./jobs/maintenanceReminderJob");

let server = null;
let shuttingDown = false;

/*
|--------------------------------------------------------------------------
| Graceful Shutdown
|--------------------------------------------------------------------------
*/

const shutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`${signal} received. Starting graceful shutdown...`);

  /*
   * If HTTP server has not started,
   * close database and exit.
   */
  if (!server) {
    try {
      await disconnectDatabase();
    } catch (error) {
      console.error(`Database shutdown error: ${error.message}`);
    }

    process.exit(0);

    return;
  }

  server.close(async (serverError) => {
    if (serverError) {
      console.error(`HTTP server shutdown error: ${serverError.message}`);

      try {
        await disconnectDatabase();
      } catch (databaseError) {
        console.error(`Database shutdown error: ${databaseError.message}`);
      }

      process.exit(1);

      return;
    }

    try {
      await disconnectDatabase();

      console.log("Database connection closed.");

      console.log("Application shutdown completed.");

      process.exit(0);
    } catch (databaseError) {
      console.error(`Database shutdown error: ${databaseError.message}`);

      process.exit(1);
    }
  });
};

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  try {
    await connectDatabase();

    /*
     * Start scheduled jobs only after
     * database connection succeeds.
     */
    startMaintenanceReminderJob();

    server = http.createServer(app);

    server.listen(env.port, () => {
      console.log(
        `AZ Fish Farm API running on port ${env.port} in ${env.nodeEnv} mode.`,
      );
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${env.port} is already in use.`);
      } else {
        console.error(`Server error: ${error.message}`);
      }

      process.exit(1);
    });
  } catch (error) {
    console.error(`Unable to start application: ${error.message}`);

    process.exit(1);
  }
};

/*
|--------------------------------------------------------------------------
| Process Signals
|--------------------------------------------------------------------------
*/

process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("SIGINT", () => shutdown("SIGINT"));

/*
|--------------------------------------------------------------------------
| Unhandled Promise Rejection
|--------------------------------------------------------------------------
*/

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);

  shutdown("UNHANDLED_REJECTION");
});

/*
|--------------------------------------------------------------------------
| Uncaught Exception
|--------------------------------------------------------------------------
*/

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);

  shutdown("UNCAUGHT_EXCEPTION");
});

/*
|--------------------------------------------------------------------------
| Start Application
|--------------------------------------------------------------------------
*/

startServer();
