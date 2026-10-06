import {
  escapeHtml,
  formatDateTime,
  formatMoney,
} from "./email.helpers";

/*
|--------------------------------------------------------------------------
| Wowyou EventOS Brand
|--------------------------------------------------------------------------
*/

const BRAND_NAME = "Wowyou";
const PRODUCT_NAME = "EventOS";
const FULL_BRAND = `${BRAND_NAME} ${PRODUCT_NAME}`;

const BRAND_PRIMARY = "#3E86A4";
const BRAND_PRIMARY_DARK = "#2F6B86";

const EMAIL_LOGO_URL =
  process.env.EVENTOS_LOGO_URL?.trim() || "";

const EMAIL_WEBSITE_URL =
  (
    process.env.EVENTOS_WEB_URL ??
    process.env.WEB_APP_URL ??
    process.env.FRONTEND_URL ??
    ""
  ).replace(/\/+$/, "");

/*
|--------------------------------------------------------------------------
| Brand Header
|--------------------------------------------------------------------------
|
| The logo is loaded from a publicly accessible HTTPS URL.
|
| Set:
|
| EVENTOS_LOGO_URL=https://your-domain.com/logo.png
|
| If the logo URL is unavailable, the email falls back to a clean
| text-based Wowyou EventOS wordmark.
|
*/

function brandHeader(): string {
  if (EMAIL_LOGO_URL) {
    return `
      <a
        href="${escapeHtml(
          EMAIL_WEBSITE_URL || "#",
        )}"
        style="
          display:inline-block;
          text-decoration:none;
        "
      >
        <img
          src="${escapeHtml(
            EMAIL_LOGO_URL,
          )}"
          alt="${FULL_BRAND}"
          style="
            display:block;
            width:auto;
            max-width:220px;
            max-height:52px;
            border:0;
            outline:none;
            text-decoration:none;
          "
        />
      </a>
    `;
  }

  return `
    <a
      href="${escapeHtml(
        EMAIL_WEBSITE_URL || "#",
      )}"
      style="
        display:inline-block;
        text-decoration:none;
        color:#ffffff;
      "
    >
      <table
        cellpadding="0"
        cellspacing="0"
        border="0"
      >
        <tr>
          <td
            style="
              width:38px;
              height:38px;
              background:${BRAND_PRIMARY};
              border-radius:10px;
              text-align:center;
              vertical-align:middle;
              color:#ffffff;
              font-size:19px;
              font-weight:900;
              line-height:38px;
            "
          >
            W
          </td>

          <td
            style="
              padding-left:11px;
              vertical-align:middle;
            "
          >
            <div
              style="
                color:#ffffff;
                font-size:17px;
                font-weight:800;
                line-height:20px;
              "
            >
              Wowyou
            </div>

            <div
              style="
                margin-top:1px;
                color:${BRAND_PRIMARY};
                font-size:10px;
                font-weight:800;
                letter-spacing:.16em;
                text-transform:uppercase;
                line-height:13px;
              "
            >
              EventOS
            </div>
          </td>
        </tr>
      </table>
    </a>
  `;
}

/*
|--------------------------------------------------------------------------
| Email Layout
|--------------------------------------------------------------------------
*/

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

  <meta
    name="color-scheme"
    content="dark"
  />

  <meta
    name="supported-color-schemes"
    content="dark"
  />

  <title>${FULL_BRAND}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    width:100%;
    background:#07090B;
    color:#ffffff;
    font-family:
      Arial,
      Helvetica,
      sans-serif;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      width:100%;
      margin:0;
      padding:0;
      background:#07090B;
    "
  >
    <tr>
      <td
        align="center"
        style="
          padding:42px 16px;
        "
      >
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            width:100%;
            max-width:600px;
            background:#101316;
            border:1px solid #20262A;
            border-radius:20px;
            overflow:hidden;
          "
        >

          <!-- Brand Header -->

          <tr>
            <td
              style="
                padding:26px 30px;
                border-bottom:1px solid #20262A;
                background:#0C0F11;
              "
            >
              ${brandHeader()}
            </td>
          </tr>

          <!-- Content -->

          <tr>
            <td
              style="
                padding:34px 30px;
              "
            >
              ${content}
            </td>
          </tr>

          <!-- Footer -->

          <tr>
            <td
              style="
                padding:24px 30px;
                border-top:1px solid #20262A;
                background:#0C0F11;
              "
            >
              <div
                style="
                  color:#ffffff;
                  font-size:13px;
                  font-weight:700;
                  margin-bottom:7px;
                "
              >
                ${FULL_BRAND}
              </div>

              <div
                style="
                  color:#6F777C;
                  font-size:12px;
                  line-height:1.7;
                "
              >
                Event technology for modern events,
                organisers, attendees and vendors.
              </div>

              <div
                style="
                  margin-top:14px;
                  color:#555D62;
                  font-size:11px;
                  line-height:1.6;
                "
              >
                This is a transactional email from
                ${FULL_BRAND}.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/*
|--------------------------------------------------------------------------
| Button
|--------------------------------------------------------------------------
*/

function button(
  label: string,
  url: string,
): string {
  return `
    <a
      href="${escapeHtml(url)}"
      style="
        display:inline-block;
        padding:14px 22px;
        background:${BRAND_PRIMARY};
        color:#ffffff;
        text-decoration:none;
        border-radius:11px;
        font-size:14px;
        font-weight:800;
        line-height:1;
      "
    >
      ${escapeHtml(label)}
    </a>
  `;
}

/*
|--------------------------------------------------------------------------
| Section Label
|--------------------------------------------------------------------------
*/

function sectionLabel(
  text: string,
): string {
  return `
    <p
      style="
        margin:0 0 9px;
        color:${BRAND_PRIMARY};
        font-size:11px;
        font-weight:800;
        text-transform:uppercase;
        letter-spacing:.14em;
      "
    >
      ${escapeHtml(text)}
    </p>
  `;
}

/*
|--------------------------------------------------------------------------
| Verification Email
|--------------------------------------------------------------------------
*/

export function verificationEmailTemplate(
  input: {
    firstName: string;
    verificationUrl: string;
  },
) {
  const content = `
    ${sectionLabel(
      "Verify your email",
    )}

    <h1
      style="
        margin:0 0 18px;
        color:#ffffff;
        font-size:30px;
        line-height:1.18;
        letter-spacing:-.02em;
      "
    >
      Welcome to Wowyou EventOS.
    </h1>

    <p
      style="
        margin:0;
        color:#AAB1B6;
        font-size:15px;
        line-height:1.75;
      "
    >
      Hi ${escapeHtml(
        input.firstName,
      )},
      confirm your email address to finish
      setting up your EventOS account.
    </p>

    <div
      style="
        margin-top:28px;
      "
    >
      ${button(
        "Verify email",
        input.verificationUrl,
      )}
    </div>

    <p
      style="
        margin:24px 0 0;
        color:#626B70;
        font-size:12px;
        line-height:1.6;
      "
    >
      If you did not create an EventOS account,
      you can safely ignore this email.
    </p>
  `;

  return {
    subject:
      "Verify your Wowyou EventOS email",

    html:
      layout(content),

    text: `
Welcome to Wowyou EventOS.

Hi ${input.firstName},

Confirm your email address:

${input.verificationUrl}

If you did not create an EventOS account,
you can safely ignore this email.
    `.trim(),
  };
}

/*
|--------------------------------------------------------------------------
| Login OTP
|--------------------------------------------------------------------------
*/

export function loginOtpEmailTemplate(
  input: {
    firstName?: string;
    otp: string;
  },
) {
  const greeting =
    input.firstName
      ? `Hi ${escapeHtml(
          input.firstName,
        )},`
      : "Hi,";

  const content = `
    ${sectionLabel(
      "Login verification",
    )}

    <h1
      style="
        margin:0 0 18px;
        color:#ffffff;
        font-size:30px;
        line-height:1.18;
      "
    >
      Your EventOS login code
    </h1>

    <p
      style="
        margin:0;
        color:#AAB1B6;
        font-size:15px;
        line-height:1.75;
      "
    >
      ${greeting}
      use the code below to complete your login.
    </p>

    <div
      style="
        margin:28px 0;
        padding:22px;
        background:#171C20;
        border:1px solid #293136;
        border-radius:14px;
        text-align:center;
      "
    >
      <div
        style="
          color:#ffffff;
          font-size:36px;
          font-weight:900;
          letter-spacing:.28em;
        "
      >
        ${escapeHtml(
          input.otp,
        )}
      </div>
    </div>

    <p
      style="
        margin:0;
        color:#626B70;
        font-size:12px;
        line-height:1.6;
      "
    >
      If you did not attempt to log in,
      you can safely ignore this email.
    </p>
  `;

  return {
    subject:
      `${input.otp} is your Wowyou EventOS login code`,

    html:
      layout(content),

    text: `
Your Wowyou EventOS login code is:

${input.otp}

If you did not attempt to log in,
you can safely ignore this email.
    `.trim(),
  };
}

/*
|--------------------------------------------------------------------------
| Ticket Purchase Email
|--------------------------------------------------------------------------
*/

export function ticketPurchaseEmailTemplate(
  input: {
    firstName: string;
    eventTitle: string;
    ticketName: string;
    quantity: number;
    totalAmount: number;
    currency: string;
    startDate: Date | string;
    venue: string;
    ticketId: string;
  },
) {
  const content = `
    ${sectionLabel(
      "Ticket confirmed",
    )}

    <h1
      style="
        margin:0 0 18px;
        color:#ffffff;
        font-size:30px;
        line-height:1.18;
        letter-spacing:-.02em;
      "
    >
      You're going to
      ${escapeHtml(
        input.eventTitle,
      )}.
    </h1>

    <p
      style="
        margin:0;
        color:#AAB1B6;
        font-size:15px;
        line-height:1.75;
      "
    >
      Hi ${escapeHtml(
        input.firstName,
      )},
      your ticket purchase is confirmed.
      Your digital event pass is attached below.
    </p>

    <div
      style="
        margin-top:26px;
        padding:21px;
        background:#171C20;
        border:1px solid #293136;
        border-radius:15px;
      "
    >
      <div style="margin-bottom:16px;">
        <div
          style="
            color:#687177;
            font-size:10px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:.1em;
          "
        >
          Ticket
        </div>

        <div
          style="
            margin-top:5px;
            color:#ffffff;
            font-size:15px;
            font-weight:800;
          "
        >
          ${escapeHtml(
            input.ticketName,
          )}
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <div
          style="
            color:#687177;
            font-size:10px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:.1em;
          "
        >
          Quantity
        </div>

        <div
          style="
            margin-top:5px;
            color:#ffffff;
            font-size:15px;
            font-weight:800;
          "
        >
          ${input.quantity}
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <div
          style="
            color:#687177;
            font-size:10px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:.1em;
          "
        >
          Date
        </div>

        <div
          style="
            margin-top:5px;
            color:#ffffff;
            font-size:15px;
            font-weight:800;
          "
        >
          ${escapeHtml(
            formatDateTime(
              input.startDate,
            ),
          )}
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <div
          style="
            color:#687177;
            font-size:10px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:.1em;
          "
        >
          Venue
        </div>

        <div
          style="
            margin-top:5px;
            color:#ffffff;
            font-size:15px;
            font-weight:800;
          "
        >
          ${escapeHtml(
            input.venue,
          )}
        </div>
      </div>

      <div>
        <div
          style="
            color:#687177;
            font-size:10px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:.1em;
          "
        >
          Total
        </div>

        <div
          style="
            margin-top:5px;
            color:#ffffff;
            font-size:17px;
            font-weight:900;
          "
        >
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
        margin-top:30px;
        padding:24px;
        background:#0C0F11;
        border:1px solid #293136;
        border-radius:15px;
        text-align:center;
      "
    >
      <div
        style="
          margin-bottom:11px;
          color:${BRAND_PRIMARY};
          font-size:11px;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:.13em;
        "
      >
        Your EventOS ticket
      </div>

      <img
        src="cid:wowyou-ticket-qr"
        alt="Wowyou EventOS ticket QR code"
        width="220"
        height="220"
        style="
          display:block;
          width:220px;
          height:220px;
          max-width:100%;
          margin:0 auto;
          background:#ffffff;
          padding:10px;
          border-radius:13px;
        "
      />

      <div
        style="
          margin-top:13px;
          color:#687177;
          font-size:11px;
        "
      >
        Ticket ID:
        ${escapeHtml(
          input.ticketId,
        )}
      </div>
    </div>

    <p
      style="
        margin:24px 0 0;
        color:#626B70;
        font-size:12px;
        line-height:1.6;
      "
    >
      Keep this email and your QR code safe.
      You will use your EventOS pass for event check-in.
    </p>
  `;

  return {
    subject:
      `Your Wowyou EventOS ticket — ${input.eventTitle}`,

    html:
      layout(content),

    text: `
Your Wowyou EventOS ticket is confirmed.

Event: ${input.eventTitle}
Ticket: ${input.ticketName}
Quantity: ${input.quantity}
Date: ${formatDateTime(
      input.startDate,
    )}
Venue: ${input.venue}
Total: ${formatMoney(
      input.totalAmount,
      input.currency,
    )}
Ticket ID: ${input.ticketId}

Your QR ticket is included in this email.
    `.trim(),
  };
}

/*
|--------------------------------------------------------------------------
| Organizer Ticket Sale Email
|--------------------------------------------------------------------------
*/

export function organizerTicketSaleEmailTemplate(
  input: {
    organizationName: string;
    eventTitle: string;
    ticketName: string;
    quantity: number;
    totalAmount: number;
    currency: string;
    buyerName: string;
    buyerEmail: string;
  },
) {
  const content = `
    ${sectionLabel(
      "New ticket sale",
    )}

    <h1
      style="
        margin:0 0 18px;
        color:#ffffff;
        font-size:30px;
        line-height:1.18;
      "
    >
      A ticket was sold.
    </h1>

    <p
      style="
        margin:0;
        color:#AAB1B6;
        font-size:15px;
        line-height:1.75;
      "
    >
      ${escapeHtml(
        input.organizationName,
      )},
      your event just received a ticket purchase
      through Wowyou EventOS.
    </p>

    <div
      style="
        margin-top:26px;
        padding:21px;
        background:#171C20;
        border:1px solid #293136;
        border-radius:15px;
      "
    >
      <p style="margin:0 0 12px;color:#AAB1B6;">
        <strong style="color:#ffffff;">Event:</strong>
        ${escapeHtml(input.eventTitle)}
      </p>

      <p style="margin:0 0 12px;color:#AAB1B6;">
        <strong style="color:#ffffff;">Ticket:</strong>
        ${escapeHtml(input.ticketName)}
      </p>

      <p style="margin:0 0 12px;color:#AAB1B6;">
        <strong style="color:#ffffff;">Quantity:</strong>
        ${input.quantity}
      </p>

      <p style="margin:0 0 12px;color:#AAB1B6;">
        <strong style="color:#ffffff;">Total:</strong>
        ${escapeHtml(
          formatMoney(
            input.totalAmount,
            input.currency,
          ),
        )}
      </p>

      <p style="margin:0 0 12px;color:#AAB1B6;">
        <strong style="color:#ffffff;">Buyer:</strong>
        ${escapeHtml(input.buyerName)}
      </p>

      <p style="margin:0;color:#AAB1B6;">
        <strong style="color:#ffffff;">Email:</strong>
        ${escapeHtml(input.buyerEmail)}
      </p>
    </div>
  `;

  return {
    subject:
      `New ticket sale — ${input.eventTitle}`,

    html:
      layout(content),

    text: `
New ticket sale through Wowyou EventOS.

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

/*
|--------------------------------------------------------------------------
| Event Reminder
|--------------------------------------------------------------------------
*/

export function eventReminderEmailTemplate(
  input: {
    firstName: string;
    eventTitle: string;
    startDate: Date | string;
    venue: string;
  },
) {
  const content = `
    ${sectionLabel(
      "Event reminder",
    )}

    <h1
      style="
        margin:0 0 18px;
        color:#ffffff;
        font-size:30px;
        line-height:1.18;
      "
    >
      Your event is in 3 days.
    </h1>

    <p
      style="
        margin:0;
        color:#AAB1B6;
        font-size:15px;
        line-height:1.75;
      "
    >
      Hi ${escapeHtml(
        input.firstName,
      )},
      ${escapeHtml(
        input.eventTitle,
      )}
      is almost here.
    </p>

    <div
      style="
        margin-top:26px;
        padding:21px;
        background:#171C20;
        border:1px solid #293136;
        border-radius:15px;
      "
    >
      <p style="margin:0 0 12px;color:#AAB1B6;">
        <strong style="color:#ffffff;">Event:</strong>
        ${escapeHtml(input.eventTitle)}
      </p>

      <p style="margin:0 0 12px;color:#AAB1B6;">
        <strong style="color:#ffffff;">Date:</strong>
        ${escapeHtml(
          formatDateTime(
            input.startDate,
          ),
        )}
      </p>

      <p style="margin:0;color:#AAB1B6;">
        <strong style="color:#ffffff;">Venue:</strong>
        ${escapeHtml(input.venue)}
      </p>
    </div>
  `;

  return {
    subject:
      `${input.eventTitle} is in 3 days`,

    html:
      layout(content),

    text: `
Your event is in 3 days.

${input.eventTitle}
${formatDateTime(
      input.startDate,
    )}
${input.venue}
    `.trim(),
  };
}

/*
|--------------------------------------------------------------------------
| Event Thank You
|--------------------------------------------------------------------------
*/

export function eventThankYouEmailTemplate(
  input: {
    firstName: string;
    eventTitle: string;
  },
) {
  const content = `
    ${sectionLabel(
      "Thank you",
    )}

    <h1
      style="
        margin:0 0 18px;
        color:#ffffff;
        font-size:30px;
        line-height:1.18;
      "
    >
      Thanks for attending.
    </h1>

    <p
      style="
        margin:0;
        color:#AAB1B6;
        font-size:15px;
        line-height:1.75;
      "
    >
      Hi ${escapeHtml(
        input.firstName,
      )},
      thank you for being part of
      ${escapeHtml(
        input.eventTitle,
      )}.
    </p>

    <div
      style="
        margin-top:26px;
        padding:21px;
        background:#171C20;
        border:1px solid #293136;
        border-radius:15px;
      "
    >
      <div
        style="
          color:${BRAND_PRIMARY};
          font-size:11px;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:.12em;
          margin-bottom:8px;
        "
      >
        Powered by EventOS
      </div>

      <div
        style="
          color:#ffffff;
          font-size:17px;
          font-weight:800;
        "
      >
        ${escapeHtml(
          input.eventTitle,
        )}
      </div>
    </div>
  `;

  return {
    subject:
      `Thanks for attending ${input.eventTitle}`,

    html:
      layout(content),

    text: `
Thanks for attending ${input.eventTitle}.

We hope you had a great experience.

Powered by Wowyou EventOS.
    `.trim(),
  };
}