"use strict";
/*
|--------------------------------------------------------------------------
| Wowyou EventOS Email Branding
|--------------------------------------------------------------------------
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_BRAND = void 0;
exports.EMAIL_BRAND = {
    name: process.env.EMAIL_BRAND_NAME?.trim() ||
        "Wowyou EventOS",
    logoUrl: process.env.EMAIL_LOGO_URL?.trim() ||
        "",
    websiteUrl: process.env.EMAIL_BRAND_URL?.trim() ||
        "",
    primaryColor: process.env.EMAIL_PRIMARY_COLOR?.trim() ||
        "#7C3AED",
    supportEmail: process.env.EMAIL_SUPPORT_EMAIL?.trim() ||
        "",
};
