const mongoose = require("mongoose");

const env = require("../config/env");
const { connectDatabase, disconnectDatabase } = require("../config/database");

const Admin = require("../models/Admin");
const { hashPassword } = require("../utils/password");

const resetAdminPassword = async () => {
  try {
    await connectDatabase();

    const admin = await Admin.findOne({
      email: env.adminEmail,
    }).select("+password");

    if (!admin) {
      throw new Error(`Administrator account not found for ${env.adminEmail}.`);
    }

    admin.password = await hashPassword(env.adminPassword);
    admin.passwordChangedAt = new Date();

    await admin.save();

    console.log(
      `Administrator password successfully reset for ${admin.email}.`,
    );
  } catch (error) {
    console.error(`Administrator password reset failed: ${error.message}`);

    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
  }
};

resetAdminPassword();
