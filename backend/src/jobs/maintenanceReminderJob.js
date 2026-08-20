const cron = require("node-cron");

const {
  runDailyNotificationScheduler,
} = require("../services/notificationSchedulerService");

const { verifyEmailConfiguration } = require("../services/emailService");

let scheduledJob = null;

const runNotificationJob = async () => {
  try {
    const result = await runDailyNotificationScheduler();

    const feedingCount = result.feeding?.length || 0;

    const inventoryCount = result.inventory?.length || 0;

    console.log(
      `[Notification Scheduler] Feeding: ${feedingCount}, Inventory: ${inventoryCount}`,
    );

    return result;
  } catch (error) {
    console.error("[Notification Scheduler] Job failed:", error);

    return {
      feeding: [],
      inventory: [],
    };
  }
};

const startMaintenanceReminderJob = () => {
  if (scheduledJob) {
    return scheduledJob;
  }

  /*
   * Run every 5 minutes.
   *
   * This is intentional.
   *
   * We do not want the notification engine
   * to depend on a single 06:00 execution.
   */
  scheduledJob = cron.schedule("*/5 * * * *", runNotificationJob, {
    scheduled: true,
    timezone: process.env.CRON_TIMEZONE || "Africa/Lagos",
  });

  console.log("[Notification Scheduler] Started. Running every 5 minutes.");

  return scheduledJob;
};

const stopMaintenanceReminderJob = () => {
  if (!scheduledJob) {
    return;
  }

  scheduledJob.stop();
  scheduledJob = null;

  console.log("[Notification Scheduler] Stopped.");
};

const verifyNotificationEmail = async () => {
  return verifyEmailConfiguration();
};

module.exports = {
  startMaintenanceReminderJob,
  stopMaintenanceReminderJob,
  runMaintenanceReminderJob: runNotificationJob,
  verifyNotificationEmail,
};
