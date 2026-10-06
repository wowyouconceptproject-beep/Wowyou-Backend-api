"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailHeader = emailHeader;
exports.emailFooter = emailFooter;
exports.renderEmail = renderEmail;
const email_brand_1 = require("./email.brand");
function emailHeader() {
    const logo = email_brand_1.EMAIL_BRAND.logoUrl
        ? `
        <img
          src="${email_brand_1.EMAIL_BRAND.logoUrl}"
          alt="${email_brand_1.EMAIL_BRAND.name}"
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
            color:${email_brand_1.EMAIL_BRAND.primaryColor};
          "
        >
          ${email_brand_1.EMAIL_BRAND.name}
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
function emailFooter() {
    const website = email_brand_1.EMAIL_BRAND.websiteUrl
        ? `
        <a
          href="${email_brand_1.EMAIL_BRAND.websiteUrl}"
          style="
            color:${email_brand_1.EMAIL_BRAND.primaryColor};
            text-decoration:none;
          "
        >
          ${email_brand_1.EMAIL_BRAND.name}
        </a>
      `
        : email_brand_1.EMAIL_BRAND.name;
    const support = email_brand_1.EMAIL_BRAND.supportEmail
        ? `
        <div style="margin-top:8px;">
          Need help?
          <a
            href="mailto:${email_brand_1.EMAIL_BRAND.supportEmail}"
            style="
              color:${email_brand_1.EMAIL_BRAND.primaryColor};
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
        ${email_brand_1.EMAIL_BRAND.name}.
        All rights reserved.
      </div>
    </div>
  `;
}
function renderEmail(content) {
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
      ${email_brand_1.EMAIL_BRAND.name}
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
