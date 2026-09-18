import {
  escapeHtml,
  formatDate,
  formatDateTime,
  formatMoney,
  formatTime,
} from "./email.helpers";

const BRAND = "WOWYOU";

function layout(
  content: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>WOWYOU</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#080808;
    color:#ffffff;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <div
    style="
      width:100%;
      padding:40px 16px;
      box-sizing:border-box;
    "
  >
    <div
      style="
        max-width:560px;
        margin:0 auto;
        background:#111111;
        border:1px solid #242424;
        border-radius:18px;
        overflow:hidden;
      "
    >

      <div
        style="
          padding:28px 30px;
          border-bottom:1px solid #242424;
        "
      >
        <div
          style="
            font-size:18px;
            font-weight:800;
            letter-spacing:0.16em;
          "
        >
          ${BRAND}
        </div>
      </div>

      <div style="padding:30px;">
        ${content}
      </div>

      <div
        style="
          padding:22px 30px;
          border-top:1px solid #242424;
          color:#777777;
          font-size:12px;
          line-height:1.6;
        "
      >
        This is a transactional email from WOWYOU.
      </div>

    </div>
  </div>
</body>
</html>
`;
}

function button(
  label: string,
  url: string,
): string {
  return `
<a
  href="${escapeHtml(url)}"
  style="
    display:inline-block;
    padding:13px 20px;
    background:#3E86A4;
    color:#ffffff;
    text-decoration:none;
    border-radius:10px;
    font-size:14px;
    font-weight:700;
  "
>
  ${escapeHtml(label)}
</a>
`;
}

export function verificationEmailTemplate(input: {
  firstName: string;
  verificationUrl: string;
}) {
  const content = `
    <p
      style="
        margin:0 0 8px;
        color:#3E86A4;
        font-size:12px;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:.12em;
      "
    >
      Verify your email
    </p>

    <h1
      style="
        margin:0 0 18px;
        font-size:28px;
        line-height:1.2;
      "
    >
      Welcome to WOWYOU.
    </h1>

    <p
      style="
        color:#aaaaaa;
        font-size:15px;
        line-height:1.7;
      "
    >
      Hi ${escapeHtml(input.firstName)},
      confirm your email address to finish
      setting up your account.
    </p>

    <div style="margin-top:26px;">
      ${button(
        "Verify email",
        input.verificationUrl,
      )}
    </div>
  `;

  return {
    subject: "Verify your WOWYOU email",
    html: layout(content),
    text: `
Welcome to WOWYOU.

Hi ${input.firstName},

Verify your email:
${input.verificationUrl}
    `.trim(),
  };
}

export function loginOtpEmailTemplate(input: {
  firstName?: string;
  otp: string;
}) {
  const content = `
    <p
      style="
        margin:0 0 8px;
        color:#3E86A4;
        font-size:12px;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:.12em;
      "
    >
      Login verification
    </p>

    <h1
      style="
        margin:0 0 18px;
        font-size:28px;
      "
    >
      Your login code
    </h1>

    <p
      style="
        color:#aaaaaa;
        font-size:15px;
        line-height:1.7;
      "
    >
      ${input.firstName
        ? `Hi ${escapeHtml(input.firstName)},`
        : "Hi,"}
      use the code below to complete your login.
    </p>

    <div
      style="
        margin:26px 0;
        padding:20px;
        background:#181818;
        border:1px solid #292929;
        border-radius:12px;
        text-align:center;
        font-size:34px;
        font-weight:800;
        letter-spacing:.28em;
      "
    >
      ${escapeHtml(input.otp)}
    </div>

    <p
      style="
        color:#666666;
        font-size:13px;
        line-height:1.6;
      "
    >
      If you did not attempt to log in,
      you can safely ignore this email.
    </p>
  `;

  return {
    subject: `${input.otp} is your WOWYOU login code`,
    html: layout(content),
    text: `
Your WOWYOU login code is:

${input.otp}

If you did not attempt to log in,
you can safely ignore this email.
    `.trim(),
  };
}

export function ticketPurchaseEmailTemplate(input: {
  firstName: string;
  eventTitle: string;
  ticketName: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  startDate: Date | string;
  venue: string;
  ticketId: string;
}) {
  const content = `
    <p
      style="
        margin:0 0 8px;
        color:#3E86A4;
        font-size:12px;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:.12em;
      "
    >
      Ticket confirmed
    </p>

    <h1
      style="
        margin:0 0 18px;
        font-size:28px;
      "
    >
      You're going to ${escapeHtml(
        input.eventTitle,
      )}.
    </h1>

    <p
      style="
        color:#aaaaaa;
        font-size:15px;
        line-height:1.7;
      "
    >
      Hi ${escapeHtml(input.firstName)},
      your ticket purchase is confirmed.
    </p>

    <div
      style="
        margin-top:24px;
        padding:20px;
        background:#181818;
        border:1px solid #292929;
        border-radius:14px;
      "
    >
      <div style="margin-bottom:15px;">
        <div style="color:#666;font-size:11px;text-transform:uppercase;">
          Ticket
        </div>
        <div style="margin-top:4px;font-weight:700;">
          ${escapeHtml(input.ticketName)}
        </div>
      </div>

      <div style="margin-bottom:15px;">
        <div style="color:#666;font-size:11px;text-transform:uppercase;">
          Quantity
        </div>
        <div style="margin-top:4px;font-weight:700;">
          ${input.quantity}
        </div>
      </div>

      <div style="margin-bottom:15px;">
        <div style="color:#666;font-size:11px;text-transform:uppercase;">
          Date
        </div>
        <div style="margin-top:4px;font-weight:700;">
          ${escapeHtml(
            formatDateTime(input.startDate),
          )}
        </div>
      </div>

      <div style="margin-bottom:15px;">
        <div style="color:#666;font-size:11px;text-transform:uppercase;">
          Venue
        </div>
        <div style="margin-top:4px;font-weight:700;">
          ${escapeHtml(input.venue)}
        </div>
      </div>

      <div>
        <div style="color:#666;font-size:11px;text-transform:uppercase;">
          Total
        </div>
        <div style="margin-top:4px;font-weight:700;">
          ${escapeHtml(
            formatMoney(
              input.totalAmount,
              input.currency,
            ),
          )}
        </div>
      </div>
    </div>

    <div
      style="
        margin-top:28px;
        text-align:center;
      "
    >
      <div
        style="
          margin-bottom:10px;
          color:#777;
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.12em;
        "
      >
        Your ticket QR code
      </div>

      <img
        src="cid:wowyou-ticket-qr"
        alt="WOWYOU ticket QR code"
        width="220"
        height="220"
        style="
          width:220px;
          height:220px;
          background:#ffffff;
          padding:10px;
          border-radius:12px;
        "
      />

      <div
        style="
          margin-top:12px;
          color:#666;
          font-size:11px;
        "
      >
        Ticket ID: ${escapeHtml(input.ticketId)}
      </div>
    </div>
  `;

  return {
    subject: `Your WOWYOU ticket — ${input.eventTitle}`,
    html: layout(content),
    text: `
Your ticket is confirmed.

Event: ${input.eventTitle}
Ticket: ${input.ticketName}
Quantity: ${input.quantity}
Date: ${formatDateTime(input.startDate)}
Venue: ${input.venue}
Total: ${formatMoney(
      input.totalAmount,
      input.currency,
    )}
Ticket ID: ${input.ticketId}
    `.trim(),
  };
}

export function organizerTicketSaleEmailTemplate(input: {
  organizationName: string;
  eventTitle: string;
  ticketName: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
}) {
  const content = `
    <p
      style="
        margin:0 0 8px;
        color:#3E86A4;
        font-size:12px;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:.12em;
      "
    >
      New ticket sale
    </p>

    <h1
      style="
        margin:0 0 18px;
        font-size:28px;
      "
    >
      A ticket was sold.
    </h1>

    <p
      style="
        color:#aaaaaa;
        font-size:15px;
        line-height:1.7;
      "
    >
      ${escapeHtml(input.organizationName)},
      your event just received a ticket purchase.
    </p>

    <div
      style="
        margin-top:24px;
        padding:20px;
        background:#181818;
        border:1px solid #292929;
        border-radius:14px;
      "
    >
      <p><strong>Event:</strong> ${escapeHtml(input.eventTitle)}</p>
      <p><strong>Ticket:</strong> ${escapeHtml(input.ticketName)}</p>
      <p><strong>Quantity:</strong> ${input.quantity}</p>
      <p><strong>Total:</strong> ${escapeHtml(
        formatMoney(
          input.totalAmount,
          input.currency,
        ),
      )}</p>
      <p><strong>Buyer:</strong> ${escapeHtml(input.buyerName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(input.buyerEmail)}</p>
    </div>
  `;

  return {
    subject: `New ticket sale — ${input.eventTitle}`,
    html: layout(content),
    text: `
New ticket sale.

Event: ${input.eventTitle}
Ticket: ${input.ticketName}
Quantity: ${input.quantity}
Total: ${formatMoney(
      input.totalAmount,
      input.currency,
    )}
Buyer: ${input.buyerName}
Email: ${input.buyerEmail}
    `.trim(),
  };
}

export function eventReminderEmailTemplate(input: {
  firstName: string;
  eventTitle: string;
  startDate: Date | string;
  venue: string;
}) {
  const content = `
    <p
      style="
        color:#3E86A4;
        font-size:12px;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:.12em;
      "
    >
      Event reminder
    </p>

    <h1 style="margin:0 0 18px;font-size:28px;">
      Your event is in 3 days.
    </h1>

    <p style="color:#aaaaaa;font-size:15px;line-height:1.7;">
      Hi ${escapeHtml(input.firstName)},
      ${escapeHtml(input.eventTitle)}
      is almost here.
    </p>

    <div
      style="
        margin-top:24px;
        padding:20px;
        background:#181818;
        border:1px solid #292929;
        border-radius:14px;
      "
    >
      <p><strong>Event:</strong> ${escapeHtml(input.eventTitle)}</p>
      <p><strong>Date:</strong> ${escapeHtml(
        formatDateTime(input.startDate),
      )}</p>
      <p><strong>Venue:</strong> ${escapeHtml(input.venue)}</p>
    </div>
  `;

  return {
    subject: `${input.eventTitle} is in 3 days`,
    html: layout(content),
    text: `
Your event is in 3 days.

${input.eventTitle}
${formatDateTime(input.startDate)}
${input.venue}
    `.trim(),
  };
}

export function eventThankYouEmailTemplate(input: {
  firstName: string;
  eventTitle: string;
}) {
  const content = `
    <p
      style="
        color:#3E86A4;
        font-size:12px;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:.12em;
      "
    >
      Thank you
    </p>

    <h1 style="margin:0 0 18px;font-size:28px;">
      Thanks for attending.
    </h1>

    <p style="color:#aaaaaa;font-size:15px;line-height:1.7;">
      Hi ${escapeHtml(input.firstName)},
      thank you for being part of
      ${escapeHtml(input.eventTitle)}.
    </p>
  `;

  return {
    subject: `Thanks for attending ${input.eventTitle}`,
    html: layout(content),
    text: `
Thanks for attending ${input.eventTitle}.

We hope you had a great experience.
    `.trim(),
  };
}