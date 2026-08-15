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
          redirectUrl.trim(),
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