import {
  Response,
} from "express";

import {
  AuthRequest,
} from "../auth/auth.middleware";

import {
  OrganizerPlan,
} from "@prisma/client";

import {
  getPlans,
  getOrganizationSubscription,
  getPlan,
  createSubscriptionCheckout,
} from "./billing.service";

import {
  BillingCountry,
  BillingInterval,
} from "./billing.pricing";

import { prisma } from "../../lib/prisma";

/*
|--------------------------------------------------------------------------
| Supported Billing Countries
|--------------------------------------------------------------------------
|
| WOWYOU is positioned as an international / European event platform.
|
| GB  → United Kingdom
| US  → United States
| EU  → European Union / Euro
| CH  → Switzerland
| NO  → Norway
| SE  → Sweden
| DK  → Denmark
|
*/

const BILLING_COUNTRIES: BillingCountry[] = [
  "GB",
  "US",
  "EU",
  "CH",
  "NO",
  "SE",
  "DK",
];

/*
|--------------------------------------------------------------------------
| Supported Billing Intervals
|--------------------------------------------------------------------------
*/

const BILLING_INTERVALS: BillingInterval[] = [
  "MONTH",
  "YEAR",
];

/*
|--------------------------------------------------------------------------
| Plans
|--------------------------------------------------------------------------
*/

export async function plans(
  _req: AuthRequest,
  res: Response,
) {
  return res.json({
    success: true,

    plans:
      getPlans(),
  });
}

/*
|--------------------------------------------------------------------------
| Current Subscription
|--------------------------------------------------------------------------
*/

export async function subscription(
  req: AuthRequest,
  res: Response,
) {
  try {
    /*
    |--------------------------------------------------------------------------
    | Find Organization
    |--------------------------------------------------------------------------
    */

    const organization =
      await prisma.organization.findUnique({
        where: {
          ownerId:
            req.user!.userId,
        },
      });

    if (!organization) {
      return res.status(404).json({
        success: false,

        message:
          "Organization not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get Subscription
    |--------------------------------------------------------------------------
    */

    const result =
      await getOrganizationSubscription(
        organization.id,
      );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,

      subscription:
        result,
    });
  } catch (error: any) {
    console.error(
      "ORGANIZER SUBSCRIPTION ERROR:",
      error,
    );

    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Unable to load subscription.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Checkout
|--------------------------------------------------------------------------
*/

export async function checkout(
  req: AuthRequest,
  res: Response,
) {
  try {
    const {
      plan,
      country,
      interval,
      fullName,
      email,
      redirectUrl,
    } = req.body as {
      plan: OrganizerPlan;

      country?: BillingCountry;

      interval?: BillingInterval;

      fullName?: string;

      email?: string;

      redirectUrl?: string;
    };

    /*
    |--------------------------------------------------------------------------
    | Validate Plan
    |--------------------------------------------------------------------------
    */

    if (
      !plan ||
      !getPlan(plan)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid organizer plan.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Billing Country
    |--------------------------------------------------------------------------
    */

    if (
      !country ||
      !BILLING_COUNTRIES.includes(
        country,
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid billing country.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Billing Interval
    |--------------------------------------------------------------------------
    */

    if (
      !interval ||
      !BILLING_INTERVALS.includes(
        interval,
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid billing interval. Choose MONTH or YEAR.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Customer Details
    |--------------------------------------------------------------------------
    */

    if (
      !fullName ||
      !fullName.trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Full name is required.",
      });
    }

    if (
      !email ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Email is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Email Format
    |--------------------------------------------------------------------------
    */

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail,
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Please provide a valid email address.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Redirect URL
    |--------------------------------------------------------------------------
    */

    if (
      !redirectUrl ||
      !redirectUrl.trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Redirect URL is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Organization
    |--------------------------------------------------------------------------
    */

    const organization =
      await prisma.organization.findUnique({
        where: {
          ownerId:
            req.user!.userId,
        },
      });

    if (!organization) {
      return res.status(404).json({
        success: false,

        message:
          "Organization not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Subscription Checkout
    |--------------------------------------------------------------------------
    |
    | Pricing is resolved by:
    |
    | country
    | plan
    | interval
    |
    | Stripe handles the recurring subscription.
    |
    */

    const result =
      await createSubscriptionCheckout({
        organizationId:
          organization.id,

        plan,

        country,

        interval,

        fullName:
          fullName.trim(),

        email:
          normalizedEmail,

        redirectUrl:
          redirectUrl.trim(),
      });

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    |
    | Stripe replaces the previous Revolut checkout response.
    |
    | The webhook remains authoritative for the actual subscription
    | status. This response only provides the Checkout information
    | needed by the frontend to redirect the organizer.
    |
    */

    return res.status(200).json({
      success: true,

      checkoutUrl:
        result.checkoutUrl,

      subscriptionId:
        result.subscription.id,

      stripeSessionId:
        result.stripeSessionId,

      stripePriceId:
        result.stripePriceId,

      pricing:
        result.pricing,
    });
  } catch (error: any) {
    console.error(
      "ORGANIZER BILLING CHECKOUT ERROR:",
      error,
    );

    return res.status(400).json({
      success: false,

      message:
        error.message ||
        "Unable to create checkout.",
    });
  }
}