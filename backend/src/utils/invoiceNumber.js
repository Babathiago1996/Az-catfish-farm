const crypto = require("crypto");

const createInvoiceNumber = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  const random = crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `AZF-${year}${month}${day}-${random}`;
};

module.exports = createInvoiceNumber;