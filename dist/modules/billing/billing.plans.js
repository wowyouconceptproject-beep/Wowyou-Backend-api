"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORGANIZER_PLANS = void 0;
const client_1 = require("@prisma/client");
/*
|--------------------------------------------------------------------------
| Organizer Plans
|--------------------------------------------------------------------------
*/
exports.ORGANIZER_PLANS = {
    /*
    |--------------------------------------------------------------------------
    | Starter
    |--------------------------------------------------------------------------
    */
    STARTER: {
        plan: client_1.OrganizerPlan.STARTER,
        name: "Starter",
        description: "Everything you need to start running events.",
        features: [
            "EVENT_CREATION",
            "EVENT_PUBLISHING",
            "TICKETING",
            "ATTENDEE_MANAGEMENT",
            "BASIC_ANALYTICS",
        ],
    },
    /*
    |--------------------------------------------------------------------------
    | Professional
    |--------------------------------------------------------------------------
    */
    PROFESSIONAL: {
        plan: client_1.OrganizerPlan.PROFESSIONAL,
        name: "Professional",
        description: "Advanced tools for growing event operations.",
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
    /*
    |--------------------------------------------------------------------------
    | Business
    |--------------------------------------------------------------------------
    */
    BUSINESS: {
        plan: client_1.OrganizerPlan.BUSINESS,
        name: "Business",
        description: "Complete infrastructure for serious event businesses.",
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
    /*
    |--------------------------------------------------------------------------
    | Enterprise
    |--------------------------------------------------------------------------
    */
    ENTERPRISE: {
        plan: client_1.OrganizerPlan.ENTERPRISE,
        name: "Enterprise",
        description: "Enterprise-grade event infrastructure and support.",
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
