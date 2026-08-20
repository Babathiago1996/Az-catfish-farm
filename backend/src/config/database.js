const mongoose = require("mongoose");

const env = require("./env");

const connectDatabase = async () => {
  try {
    mongoose.set("strictQuery", true);

    const connection = await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    console.log(
      `MongoDB connected: ${connection.connection.host}/${connection.connection.name}`,
    );

    return connection;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);

    throw error;
  }
};

const disconnectDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      return;
    }

    await mongoose.connection.close();

    console.log("MongoDB connection closed.");
  } catch (error) {
    console.error(`MongoDB disconnection failed: ${error.message}`);

    throw error;
  }
};

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established.");
});

mongoose.connection.on("error", (error) => {
  console.error(`MongoDB runtime error: ${error.message}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection disconnected.");
});

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
