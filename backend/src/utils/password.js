const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

const hashPassword = async (password) => {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password must contain at least 8 characters.");
  }

  return bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (password, passwordHash) => {
  if (
    typeof password !== "string" ||
    typeof passwordHash !== "string"
  ) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
};

module.exports = {
  hashPassword,
  comparePassword
};