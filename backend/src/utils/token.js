const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const env = require("../config/env");

const createAccessToken = (adminId, sessionVersion = 0) =>
  jwt.sign(
    {
      sub: adminId,
      type: "access",
      sessionVersion: Number(sessionVersion) || 0,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    },
  );

const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (decoded.type !== "access") {
    throw new Error("Invalid access token.");
  }

  return decoded;
};

const createResetToken = (adminId) => {
  return jwt.sign(
    {
      sub: adminId,
      type: "password_reset",
      nonce: crypto.randomBytes(16).toString("hex"),
    },
    env.jwtResetSecret,
    {
      expiresIn: env.jwtResetExpiresIn,
    },
  );
};

const verifyResetToken = (token) => {
  const decoded = jwt.verify(token, env.jwtResetSecret);

  if (decoded.type !== "password_reset") {
    throw new Error("Invalid password reset token.");
  }

  return decoded;
};

const createRandomToken = (size = 32) => {
  return crypto.randomBytes(size).toString("hex");
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

module.exports = {
  createAccessToken,
  verifyAccessToken,
  createResetToken,
  verifyResetToken,
  createRandomToken,
  hashToken,
};
