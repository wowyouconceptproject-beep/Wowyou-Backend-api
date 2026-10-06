import {
  EMAIL_BRAND,
} from "./email.brand";

export function emailHeader(): string {
  const logo =
    EMAIL_BRAND.logoUrl
      ? `
        <img
          src="${EMAIL_BRAND.logoUrl}"
          alt="${EMAIL_BRAND.name}"
          style="
            display:block;
            width:180px;
            max-width:100%;
            height:auto;
            margin:0 auto;
          "
        />
      `
      : `
        <div
          style="
            font-size:24px;
            font-weight:700;
            color:${EMAIL_BRAND.primaryColor};
          "
        >
          ${EMAIL_BRAND.name}
        </div>
      `;

  return `
    <div
      style="
        padding:32px 24px 20px;
        text-align:center;
      "
    >
      ${logo}
    </div>
  `;
}

export function emailFooter(): string {
  const website =
    EMAIL_BRAND.websiteUrl
      ? `
        <a
          href="${EMAIL_BRAND.websiteUrl}"
          style="
            color:${EMAIL_BRAND.primaryColor};
            text-decoration:none;
          "
        >
          ${EMAIL_BRAND.name}
        </a>
      `
      : EMAIL_BRAND.name;

  const support =
    EMAIL_BRAND.supportEmail
      ? `
        <div style="margin-top:8px;">
          Need help?
          <a
            href="mailto:${EMAIL_BRAND.supportEmail}"
            style="
              color:${EMAIL_BRAND.primaryColor};
              text-decoration:none;
            "
          >
            Contact support
          </a>
        </div>
      `
      : "";

  return `
    <div
      style="
        padding:24px;
        border-top:1px solid #eeeeee;
        text-align:center;
        color:#777777;
        font-size:12px;
        line-height:1.6;
      "
    >
      <div>
        ${website}
      </div>

      ${support}

      <div style="margin-top:8px;">
        © ${new Date().getFullYear()}
        ${EMAIL_BRAND.name}.
        All rights reserved.
      </div>
    </div>
  `;
}

export function renderEmail(
  content: string,
): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <meta
      http-equiv="Content-Type"
      content="text/html; charset=UTF-8"
    />

    <title>
      ${EMAIL_BRAND.name}
    </title>
  </head>

  <body
    style="
      margin:0;
      padding:0;
      background:#f5f5f5;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
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
          max-width:640px;
          margin:0 auto;
          background:#ffffff;
          border-radius:16px;
          overflow:hidden;
        "
      >

        ${emailHeader()}

        <div
          style="
            padding:8px 32px 40px;
          "
        >
          ${content}
        </div>

        ${emailFooter()}

      </div>

    </div>

  </body>
</html>
  `;
}