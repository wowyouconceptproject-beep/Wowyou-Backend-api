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

import { prisma } from "../../lib/prisma";

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
    plans: getPlans(),
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

    const result =
      await getOrganizationSubscription(
        organization.id,
      );

    return res.json({
      success: true,
      subscription:
        result,
    });
  } catch (error: any) {
    console.error(
      "GET ORGANIZER SUBSCRIPTION ERROR:",
      error,
    );

    return res.status(400).json({
      success: false,
      message:
        error.message,
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
      fullName,
      email,
      redirectUrl,
    } = req.body as {
      plan: OrganizerPlan;

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
    | Validate Redirect URL
    |--------------------------------------------------------------------------
    |
    | This billing endpoint is for the organizer web platform.
    |
    | We therefore only allow redirects back to the configured WowYou
    | organizer frontend.
    |
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

    const frontendUrl =
      process.env.FRONTEND_URL;

    if (!frontendUrl) {
      console.error(
        "FRONTEND_URL is not configured.",
      );

      return res.status(500).json({
        success: false,
        message:
          "Frontend URL is not configured.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Redirect Origin
    |--------------------------------------------------------------------------
    |
    | Prevent arbitrary external redirect URLs.
    |
    */

    let requestedRedirectUrl: URL;
    let configuredFrontendUrl: URL;

    try {
      requestedRedirectUrl =
        new URL(
          redirectUrl.trim(),
        );

      configuredFrontendUrl =
        new URL(
          frontendUrl,
        );
    } catch {
      return res.status(400).json({
        success: false,
        message:
          "Invalid redirect URL.",
      });
    }

    if (
      requestedRedirectUrl.origin !==
      configuredFrontendUrl.origin
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Redirect URL is not allowed.",
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
    | Create Revolut Checkout
    |--------------------------------------------------------------------------
    */

    const result =
      await createSubscriptionCheckout({
        organizationId:
          organization.id,

        plan,

        fullName:
          fullName.trim(),

        email:
          email.trim()
            .toLowerCase(),

        redirectUrl:
          requestedRedirectUrl.toString(),
      });

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      checkoutUrl:
        result.checkoutUrl,

      subscriptionId:
        result.subscription.id,

      revolutSubscriptionId:
        result.revolutSubscriptionId,

      setupOrderId:
        result.setupOrderId,
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