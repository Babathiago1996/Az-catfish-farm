const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(
  process.env.SMTP_PORT || 587,
);
const SMTP_SECURE =
  String(
    process.env.SMTP_SECURE || "false",
  ).toLowerCase() === "true";

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD =
  process.env.SMTP_PASSWORD;

const SMTP_FROM_NAME =
  process.env.SMTP_FROM_NAME ||
  "AZ Fish Farm";

const SMTP_FROM_EMAIL =
  process.env.SMTP_FROM_EMAIL ||
  SMTP_USER;

let transporter = null;

const isConfigured = () => {
  return Boolean(
    SMTP_HOST &&
      SMTP_USER &&
      SMTP_PASSWORD &&
      SMTP_FROM_EMAIL &&
      SMTP_HOST !== "smtp.example.com",
  );
};

const getTransporter = () => {
  if (!isConfigured()) {
    throw new Error(
      "SMTP is not properly configured. Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM_EMAIL.",
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,

      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },

      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }

  return transporter;
};

const verifyEmailConfiguration =
  async () => {
    if (!isConfigured()) {
      console.warn(
        "[Email] SMTP is not configured.",
      );

      return {
        success: false,
        message:
          "SMTP is not configured.",
      };
    }

    try {
      await getTransporter().verify();

      console.log(
        "[Email] SMTP connection verified successfully.",
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "[Email] SMTP verification failed:",
        error.message,
      );

      return {
        success: false,
        message: error.message,
      };
    }
  };

const escapeHtml = (value) => {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const buildNotificationEmail = ({
  title,
  message,
  priority,
  type,
  actionUrl,
}) => {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);

  const priorityLabel =
    String(priority || "normal")
      .toUpperCase();

  const typeLabel =
    String(type || "system")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );

  const actionButton = actionUrl
    ? `
      <div style="margin-top:28px;">
        <a
          href="${escapeHtml(actionUrl)}"
          style="
            display:inline-block;
            background:#0f766e;
            color:#ffffff;
            text-decoration:none;
            padding:12px 20px;
            border-radius:8px;
            font-weight:600;
          "
        >
          Open AZ Fish Farm
        </a>
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${safeTitle}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f4f7f8;
    font-family:Arial,Helvetica,sans-serif;
    color:#172033;
  "
>
  <div style="padding:40px 16px;">
    <div
      style="
        max-width:620px;
        margin:0 auto;
        background:#ffffff;
        border-radius:16px;
        overflow:hidden;
        box-shadow:0 8px 30px rgba(0,0,0,0.08);
      "
    >

      <div
        style="
          background:#0f766e;
          color:#ffffff;
          padding:28px 32px;
        "
      >
        <div
          style="
            font-size:13px;
            opacity:.85;
            margin-bottom:8px;
          "
        >
          AZ FISH FARM
        </div>

        <div
          style="
            font-size:24px;
            font-weight:700;
          "
        >
          Farm Notification
        </div>
      </div>

      <div style="padding:32px;">

        <div
          style="
            display:inline-block;
            background:#eef7f6;
            color:#0f766e;
            padding:6px 10px;
            border-radius:999px;
            font-size:12px;
            font-weight:700;
            margin-bottom:18px;
          "
        >
          ${escapeHtml(typeLabel)}
        </div>

        <h1
          style="
            margin:0 0 14px;
            font-size:24px;
            line-height:1.3;
          "
        >
          ${safeTitle}
        </h1>

        <p
          style="
            margin:0;
            font-size:16px;
            line-height:1.7;
            color:#4b5563;
          "
        >
          ${safeMessage}
        </p>

        <div
          style="
            margin-top:24px;
            padding:14px 16px;
            background:#f8fafc;
            border-radius:10px;
            font-size:13px;
            color:#64748b;
          "
        >
          Priority:
          <strong>${escapeHtml(priorityLabel)}</strong>
        </div>

        ${actionButton}

      </div>

      <div
        style="
          padding:20px 32px;
          border-top:1px solid #e5e7eb;
          color:#94a3b8;
          font-size:12px;
          line-height:1.6;
        "
      >
        This is an automatic notification from
        AZ Fish Farm Management System.
        <br />
        Please do not reply to this automated email.
      </div>

    </div>
  </div>
</body>
</html>
`;
};

const sendNotificationEmail =
  async ({
    to,
    title,
    message,
    priority,
    type,
    actionUrl,
  }) => {
    if (!to) {
      throw new Error(
        "Notification recipient email is required.",
      );
    }

    const mailTransporter =
      getTransporter();

    const subject =
      `[AZ Fish Farm] ${title}`;

    const html =
      buildNotificationEmail({
        title,
        message,
        priority,
        type,
        actionUrl,
      });

    const text = [
      "AZ FISH FARM",
      "",
      title,
      "",
      message,
      "",
      `Priority: ${priority || "normal"}`,
      `Type: ${type || "system"}`,
    ].join("\n");

    const result =
      await mailTransporter.sendMail({
        from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
        to,
        subject,
        text,
        html,
      });

    console.log(
      `[Email] Notification sent to ${to}. Message ID: ${result.messageId}`,
    );

    return {
      success: true,
      messageId:
        result.messageId,
    };
  };

module.exports = {
  isConfigured,
  verifyEmailConfiguration,
  sendNotificationEmail,
};