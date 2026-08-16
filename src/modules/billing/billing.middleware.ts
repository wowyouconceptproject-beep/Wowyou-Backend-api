import {
  NextFunction,
  Response,
} from "express";

import {
  AuthRequest,
} from "../auth/auth.middleware";

import {
  SubscriptionStatus,
} from "@prisma/client";

import {
  ORGANIZER_PLANS,
} from "./billing.plans";

import { prisma } from "../../lib/prisma";

/*
|--------------------------------------------------------------------------
| Require Active Organizer Subscription
|--------------------------------------------------------------------------
|
| Allows requests only when the authenticated user's organization has
| an ACTIVE or TRIALING subscription.
|
*/

export async function requireActiveSubscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const organization =
      await prisma.organization.findUnique({
        where: {
          ownerId:
            req.user.userId,
        },
      });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message:
          "Organization not found.",
      });
    }

    const subscription =
      await prisma.organizationSubscription.findUnique({
        where: {
          organizationId:
            organization.id,
        },
      });

    if (!subscription) {
      return res.status(402).json({
        success: false,
        code:
          "SUBSCRIPTION_REQUIRED",
        message:
          "An active organizer subscription is required.",
      });
    }

    const active =
      subscription.status ===
        SubscriptionStatus.ACTIVE ||
      subscription.status ===
        SubscriptionStatus.TRIALING;

    if (!active) {
      return res.status(402).json({
        success: false,
        code:
          "SUBSCRIPTION_INACTIVE",
        message:
          "Your organizer subscription is not active.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Attach subscription to request
    |--------------------------------------------------------------------------
    */

    (
      req as AuthRequest & {
        organization?: typeof organization;

        subscription?: typeof subscription;
      }
    ).organization =
      organization;

    (
      req as AuthRequest & {
        organization?: typeof organization;

        subscription?: typeof subscription;
      }
    ).subscription =
      subscription;

    next();
  } catch (error) {
    console.error(
      "SUBSCRIPTION MIDDLEWARE ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify subscription.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Require Subscription Feature
|--------------------------------------------------------------------------
|
| Requires an ACTIVE/TRIALING subscription and verifies that the
| organization's current plan contains the requested feature.
|
*/

export function requireFeature(
  feature: string,
) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      const organization =
        await prisma.organization.findUnique({
          where: {
            ownerId:
              req.user.userId,
          },
        });

      if (!organization) {
        return res.status(404).json({
          success: false,
          message:
            "Organization not found.",
        });
      }

      const subscription =
        await prisma.organizationSubscription.findUnique({
          where: {
            organizationId:
              organization.id,
          },
        });

      if (!subscription) {
        return res.status(402).json({
          success: false,
          code:
            "SUBSCRIPTION_REQUIRED",
          message:
            "An active organizer subscription is required.",
        });
      }

      const active =
        subscription.status ===
          SubscriptionStatus.ACTIVE ||
        subscription.status ===
          SubscriptionStatus.TRIALING;

      if (!active) {
        return res.status(402).json({
          success: false,
          code:
            "SUBSCRIPTION_INACTIVE",
          message:
            "Your organizer subscription is not active.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Plan Feature
      |--------------------------------------------------------------------------
      */

      const config =
        ORGANIZER_PLANS[
          subscription.plan
        ];

      if (!config) {
        return res.status(403).json({
          success: false,
          code:
            "INVALID_SUBSCRIPTION_PLAN",
          message:
            "Your subscription plan is invalid.",
        });
      }

      if (
        !config.features.includes(
          feature,
        )
      ) {
        return res.status(403).json({
          success: false,
          code:
            "FEATURE_NOT_AVAILABLE",
          feature,
          plan:
            subscription.plan,
          message:
            "Your current plan does not include this feature.",
        });
      }

      (
        req as AuthRequest & {
          organization?: typeof organization;

          subscription?: typeof subscription;
        }
      ).organization =
        organization;

      (
        req as AuthRequest & {
          organization?: typeof organization;

          subscription?: typeof subscription;
        }
      ).subscription =
        subscription;

      next();
    } catch (error) {
      console.error(
        "SUBSCRIPTION FEATURE MIDDLEWARE ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify subscription feature.",
      });
    }
  };
}