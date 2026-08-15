"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORGANIZER_PLANS = void 0;
const client_1 = require("@prisma/client");
exports.ORGANIZER_PLANS = {
    STARTER: {
        plan: client_1.OrganizerPlan.STARTER,
        name: "Starter",
        amount: 49,
        currency: "GBP",
        interval: "MONTH",
        description: "Everything you need to start running events.",
        revolutPlanVariationId: process.env
            .REVOLUT_STARTER_PLAN_VARIATION_ID,
        features: [
            "EVENT_CREATION",
            "EVENT_PUBLISHING",
            "TICKETING",
            "ATTENDEE_MANAGEMENT",
            "BASIC_ANALYTICS",
        ],
    },
    PROFESSIONAL: {
        plan: client_1.OrganizerPlan.PROFESSIONAL,
        name: "Professional",
        amount: 149,
        currency: "GBP",
        interval: "MONTH",
        description: "Advanced tools for growing event operations.",
        revolutPlanVariationId: process.env
            .REVOLUT_PROFESSIONAL_PLAN_VARIATION_ID,
        features: [
            "EVENT_CREATION",
            "EVENT_PUBLISHING",
            "TICKETING",
            "ATTENDEE_MANAGEMENT",
            "STAFF_MANAGEMENT",
            "OPERATIONS",
            "ANNOUNCEMENTS",
            "ADVANCED_ANALYTICS",
            "REPORTS",
        ],
    },
    BUSINESS: {
        plan: client_1.OrganizerPlan.BUSINESS,
        name: "Business",
        amount: 399,
        currency: "GBP",
        interval: "MONTH",
        description: "Complete infrastructure for serious event businesses.",
        revolutPlanVariationId: process.env
            .REVOLUT_BUSINESS_PLAN_VARIATION_ID,
        features: [
            "EVENT_CREATION",
            "EVENT_PUBLISHING",
            "TICKETING",
            "ATTENDEE_MANAGEMENT",
            "STAFF_MANAGEMENT",
            "OPERATIONS",
            "ANNOUNCEMENTS",
            "VENDOR_MANAGEMENT",
            "ADVANCED_ANALYTICS",
            "REPORTS",
            "AI_FEATURES",
            "MULTIPLE_EVENTS",
        ],
    },
    ENTERPRISE: {
        plan: client_1.OrganizerPlan.ENTERPRISE,
        name: "Enterprise",
        amount: 1500,
        currency: "GBP",
        interval: "MONTH",
        description: "Enterprise-grade event infrastructure and support.",
        revolutPlanVariationId: process.env
            .REVOLUT_ENTERPRISE_PLAN_VARIATION_ID,
        features: [
            "EVENT_CREATION",
            "EVENT_PUBLISHING",
            "TICKETING",
            "ATTENDEE_MANAGEMENT",
            "STAFF_MANAGEMENT",
            "OPERATIONS",
            "ANNOUNCEMENTS",
            "VENDOR_MANAGEMENT",
            "ADVANCED_ANALYTICS",
            "REPORTS",
            "AI_FEATURES",
            "MULTIPLE_EVENTS",
            "ENTERPRISE_SUPPORT",
            "CUSTOM_REQUIREMENTS",
        ],
    },
};
