const Sale = require("../models/Sale");
const FarmSettings = require("../models/FarmSettings");

const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2
    }
  ).format(Number(value) || 0);
};

const formatDate = (value) => {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  ).format(new Date(value));
};

const getInvoiceData = async (id) => {
  const sale =
    await Sale.findById(id)
      .populate(
        "pond",
        "pondName pondNumber"
      )
      .lean();

  if (!sale) {
    return null;
  }

  const settings =
    await FarmSettings.findOne()
      .lean();

  return {
    sale,
    settings: settings || {}
  };
};

const generateInvoiceHtml = ({
  sale,
  settings
}) => {
  const farmName =
    settings.farmName ||
    "AZ Fish Farm";

  const logo =
    settings.farmLogo || "";

  const phone =
    settings.phone || "";

  const email =
    settings.email || "";

  const address =
    settings.address || "";

  const pondName =
    sale.pond?.pondName ||
    "Not specified";

  const pondNumber =
    sale.pond?.pondNumber ||
    "";

  const paymentStatus =
    sale.paymentStatus ||
    "pending";

  const statusLabel =
    paymentStatus
      .charAt(0)
      .toUpperCase() +
    paymentStatus.slice(1);

  const outstanding =
    Math.max(
      Number(sale.totalAmount || 0) -
        Number(sale.amountPaid || 0),
      0
    );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>
    ${escapeHtml(farmName)}
    - Invoice ${escapeHtml(sale.invoiceNumber)}
  </title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 32px;
      background: #f4f7f5;
      color: #17211b;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
    }

    .invoice {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      padding: 42px;
      border-radius: 18px;
      box-shadow:
        0 12px 40px
        rgba(0, 0, 0, 0.08);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      border-bottom: 1px solid #e5e9e6;
      padding-bottom: 28px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo {
      width: 70px;
      height: 70px;
      object-fit: contain;
      border-radius: 12px;
    }

    .brand h1 {
      margin: 0;
      font-size: 24px;
    }

    .brand p {
      margin: 6px 0 0;
      color: #66736b;
      line-height: 1.5;
    }

    .invoice-title {
      text-align: right;
    }

    .invoice-title h2 {
      margin: 0;
      font-size: 30px;
      letter-spacing: 1px;
    }

    .invoice-title p {
      margin: 8px 0 0;
      color: #66736b;
    }

    .details {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 28px;
      margin: 32px 0;
    }

    .detail-box {
      padding: 18px;
      background: #f7faf8;
      border-radius: 12px;
    }

    .label {
      display: block;
      margin-bottom: 7px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #718078;
      font-weight: 700;
    }

    .value {
      font-size: 15px;
      line-height: 1.5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }

    th,
    td {
      padding: 15px 12px;
      text-align: left;
      border-bottom: 1px solid #e8ece9;
    }

    th {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #68756e;
      background: #f7faf8;
    }

    .number {
      text-align: right;
    }

    .totals {
      width: 360px;
      max-width: 100%;
      margin:
        28px 0 0 auto;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 10px 0;
      color: #59655e;
    }

    .total-row.grand {
      margin-top: 6px;
      padding-top: 18px;
      border-top: 2px solid #17211b;
      color: #17211b;
      font-size: 20px;
      font-weight: 700;
    }

    .status {
      display: inline-block;
      padding: 7px 12px;
      border-radius: 999px;
      background: #edf5ef;
      color: #315d3b;
      font-weight: 700;
      font-size: 12px;
    }

    .footer {
      margin-top: 42px;
      padding-top: 24px;
      border-top: 1px solid #e5e9e6;
      color: #68756e;
      font-size: 13px;
      line-height: 1.6;
    }

    .print-button {
      display: block;
      margin: 0 auto 22px;
      padding: 12px 20px;
      border: 0;
      border-radius: 10px;
      background: #17211b;
      color: white;
      cursor: pointer;
      font-weight: 700;
    }

    @media print {
      body {
        padding: 0;
        background: white;
      }

      .invoice {
        max-width: none;
        padding: 24px;
        box-shadow: none;
        border-radius: 0;
      }

      .print-button {
        display: none;
      }
    }

    @media (max-width: 650px) {
      body {
        padding: 12px;
      }

      .invoice {
        padding: 22px;
      }

      .header {
        flex-direction: column;
      }

      .invoice-title {
        text-align: left;
      }

      .details {
        grid-template-columns: 1fr;
      }

      table {
        font-size: 13px;
      }
    }
  </style>
</head>

<body>
  <button
    class="print-button"
    onclick="window.print()"
  >
    Print Receipt
  </button>

  <main class="invoice">
    <section class="header">
      <div class="brand">
        ${
          logo
            ? `<img
                class="logo"
                src="${escapeHtml(logo)}"
                alt="${escapeHtml(farmName)}"
              />`
            : ""
        }

        <div>
          <h1>
            ${escapeHtml(farmName)}
          </h1>

          <p>
            ${escapeHtml(address)}
            ${
              address && phone
                ? "<br />"
                : ""
            }
            ${escapeHtml(phone)}
            ${
              phone && email
                ? " · "
                : ""
            }
            ${escapeHtml(email)}
          </p>
        </div>
      </div>

      <div class="invoice-title">
        <h2>RECEIPT</h2>

        <p>
          ${escapeHtml(
            sale.invoiceNumber
          )}
        </p>

        <p>
          ${escapeHtml(
            formatDate(sale.saleDate)
          )}
        </p>
      </div>
    </section>

    <section class="details">
      <div class="detail-box">
        <span class="label">
          Customer
        </span>

        <div class="value">
          ${escapeHtml(
            sale.customerName
          )}

          ${
            sale.phoneNumber
              ? `<br />${escapeHtml(
                  sale.phoneNumber
                )}`
              : ""
          }
        </div>
      </div>

      <div class="detail-box">
        <span class="label">
          Farm Pond
        </span>

        <div class="value">
          ${escapeHtml(pondName)}
          ${
            pondNumber
              ? ` · Pond ${escapeHtml(
                  pondNumber
                )}`
              : ""
          }
        </div>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="number">
            Quantity
          </th>
          <th class="number">
            Avg. Weight
          </th>
          <th class="number">
            Total Weight
          </th>
          <th class="number">
            Amount
          </th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td>
            Catfish
          </td>

          <td class="number">
            ${escapeHtml(
              sale.quantitySold
            )}
          </td>

          <td class="number">
            ${escapeHtml(
              sale.averageWeight
            )} g
          </td>

          <td class="number">
            ${escapeHtml(
              sale.totalWeight
            )} kg
          </td>

          <td class="number">
            ${escapeHtml(
              formatCurrency(
                sale.totalAmount
              )
            )}
          </td>
        </tr>
      </tbody>
    </table>

    <section class="totals">
      <div class="total-row">
        <span>
          Total Amount
        </span>

        <strong>
          ${escapeHtml(
            formatCurrency(
              sale.totalAmount
            )
          )}
        </strong>
      </div>

      <div class="total-row">
        <span>
          Amount Paid
        </span>

        <strong>
          ${escapeHtml(
            formatCurrency(
              sale.amountPaid
            )
          )}
        </strong>
      </div>

      <div class="total-row">
        <span>
          Outstanding
        </span>

        <strong>
          ${escapeHtml(
            formatCurrency(
              outstanding
            )
          )}
        </strong>
      </div>

      <div class="total-row">
        <span>
          Payment Status
        </span>

        <span class="status">
          ${escapeHtml(statusLabel)}
        </span>
      </div>

      <div class="total-row grand">
        <span>
          Total
        </span>

        <span>
          ${escapeHtml(
            formatCurrency(
              sale.totalAmount
            )
          )}
        </span>
      </div>
    </section>

    ${
      sale.notes
        ? `
          <section class="footer">
            <strong>Notes</strong>
            <br />
            ${escapeHtml(sale.notes)}
          </section>
        `
        : ""
    }

    <footer class="footer">
      Thank you for choosing
      ${escapeHtml(farmName)}.
      <br />
      This receipt was generated
      electronically.
    </footer>
  </main>
</body>
</html>`;
};

module.exports = {
  getInvoiceData,
  generateInvoiceHtml
};