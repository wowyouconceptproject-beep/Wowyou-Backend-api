import {
  OrganizerPlan,
} from "@prisma/client";

/*
|--------------------------------------------------------------------------
| Billing Interval
|--------------------------------------------------------------------------
|
| Pricing supports both monthly and yearly billing.
|
*/

export type BillingInterval =
  | "MONTH"
  | "YEAR";

/*
|--------------------------------------------------------------------------
| Organizer Plan Configuration
|--------------------------------------------------------------------------
|
| This file contains the identity and feature set of each plan.
|
| IMPORTANT:
|
| Pricing does NOT live here anymore.
|
| Price is resolved dynamically from:
|
| country + plan + interval
|
| in billing.pricing.ts.
|
*/

export interface OrganizerPlanConfig {
  plan: OrganizerPlan;

  name: string;

  description: string;

  features: string[];
}

/*
|--------------------------------------------------------------------------
| Organizer Plans
|--------------------------------------------------------------------------
*/

export const ORGANIZER_PLANS: Record<
  OrganizerPlan,
  OrganizerPlanConfig
> = {
  /*
  |--------------------------------------------------------------------------
  | Starter
  |--------------------------------------------------------------------------
  */

  STARTER: {
    plan:
      OrganizerPlan.STARTER,

    name:
      "Starter",

    description:
      "Everything you need to start running events.",

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
    plan:
      OrganizerPlan.PROFESSIONAL,

    name:
      "Professional",

    description:
      "Advanced tools for growing event operations.",

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
    plan:
      OrganizerPlan.BUSINESS,

    name:
      "Business",

    description:
      "Complete infrastructure for serious event businesses.",

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
    plan:
      OrganizerPlan.ENTERPRISE,

    name:
      "Enterprise",

    description:
      "Enterprise-grade event infrastructure and support.",

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