"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COOKIE_CATEGORIES = exports.CURRENT_POLICIES = exports.CURRENT_COOKIE_POLICY_VERSION = exports.CURRENT_POLICY_VERSION = void 0;
exports.CURRENT_POLICY_VERSION = "v1.0";
exports.CURRENT_COOKIE_POLICY_VERSION = "v1.0";
exports.CURRENT_POLICIES = [
    {
        key: "terms",
        name: "Terms of Service",
        required: true,
    },
    {
        key: "privacy",
        name: "Privacy Policy",
        required: true,
    },
    {
        key: "acceptableUse",
        name: "Acceptable Use Policy",
        required: true,
    },
    {
        key: "refunds",
        name: "Refund & Cancellation Policy",
        required: true,
    },
    {
        key: "ai",
        name: "AI Usage Policy",
        required: true,
    },
    {
        key: "subprocessors",
        name: "Sub-processor List",
        required: true,
    },
    {
        key: "dpa",
        name: "Data Processing Agreement",
        required: false,
    },
    {
        key: "marketplace",
        name: "Marketplace Vendor Terms",
        required: false,
    },
];
exports.COOKIE_CATEGORIES = [
    {
        key: "strictlyNecessary",
        name: "Strictly Necessary",
        required: true,
    },
    {
        key: "analytics",
        name: "Performance & Analytics",
        required: false,
    },
    {
        key: "functional",
        name: "Functional & Personalisation",
        required: false,
    },
    {
        key: "aiPersonalisation",
        name: "AI Personalisation",
        required: false,
    },
    {
        key: "marketing",
        name: "Marketing & Advertising",
        required: false,
    },
];
