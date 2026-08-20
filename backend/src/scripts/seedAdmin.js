const mongoose = require("mongoose");

const env = require("../config/env");
const {
  connectDatabase,
  disconnectDatabase
} = require("../config/database");

const Admin = require("../models/Admin");
const FarmSettings = require("../models/FarmSettings");
const {
  hashPassword
} = require("../utils/password");

const seedAdmin = async () => {
  try {
    await connectDatabase();

    let admin = await Admin.findOne({
      email: env.adminEmail
    }).select("+password");

    if (!admin) {
      admin = await Admin.create({
        email: env.adminEmail,
        password: await hashPassword(env.adminPassword),
        isActive: true
      });

      console.log(
        `Administrator account created for ${admin.email}.`
      );
    } else {
      console.log(
        `Administrator account already exists for ${admin.email}.`
      );
    }

    const existingSettings = await FarmSettings.findOne({
      singletonKey: "default"
    });

    if (!existingSettings) {
      await FarmSettings.create({
        singletonKey: "default",
        farmName: "AZ Fish Farm",
        waterChangeIntervalDays:
          env.waterChangeIntervalDays,
        feedingSchedule: {
          morning: {
            enabled: true,
            time: "08:00"
          },
          afternoon: {
            enabled: false,
            time: "14:00"
          },
          evening: {
            enabled: true,
            time: "18:00"
          }
        },
        notificationPreferences: {
          emailNotifications: true,
          inAppNotifications: true,
          waterChangeReminders: true,
          feedingReminders: true,
          growthReminders: true,
          harvestReminders: true,
          inventoryAlerts: true,
          monthlyReportNotifications: true
        }
      });

      console.log("Default farm settings created.");
    } else {
      console.log("Default farm settings already exist.");
    }

    console.log("AZ Fish Farm seed operation completed.");
  } catch (error) {
    console.error(
      `AZ Fish Farm seed operation failed: ${error.message}`
    );

    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
  }
};

seedAdmin();