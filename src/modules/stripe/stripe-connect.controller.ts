import { Response } from "express";
import { AuthRequest } from "../auth/auth.middleware";
import {
  createConnectedAccount,
  createLoginLink,
  createOnboardingLink,
  getOrganizationStripeStatus,
} from "./stripe-connect.service";
import { prisma } from "../../lib/prisma";

/*
|--------------------------------------------------------------------------
| Create Stripe Connect Account
|--------------------------------------------------------------------------
*/

export async function createAccount(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const organizationId = String(
      req.body.organizationId ?? "",
    ).trim();

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "organizationId is required.",
      });
    }

    const organization =
      await prisma.organization.findFirst({
        where: {
          id: organizationId,
          ownerId: userId,
        },
      });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message:
          "Organization not found or you are not the owner.",
      });
    }

    const email = String(
      req.body.email ?? "",
    ).trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required.",
      });
    }

    const account =
      await createConnectedAccount({
        organizationId,
        email,
        businessName:
          String(
            req.body.businessName ?? "",
          ).trim() || organization.name,
        country:
          String(
            req.body.country ?? "",
          ).trim() || undefined,
      });

    return res.status(201).json({
      success: true,
      account: {
        id: account.id,
        type: account.type,
        chargesEnabled:
          account.charges_enabled,
        payoutsEnabled:
          account.payouts_enabled,
        detailsSubmitted:
          account.details_submitted,
      },
    });
  } catch (error) {
    console.error(
      "Stripe Connect account creation error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create Stripe Connect account.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Start Onboarding
|--------------------------------------------------------------------------
*/

export async function onboarding(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const organizationId = String(
      req.body.organizationId ??
        req.query.organizationId ??
        "",
    ).trim();

    const organization =
      await prisma.organization.findFirst({
        where: {
          id: organizationId,
          ownerId: userId,
        },
      });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    const result =
      await createOnboardingLink(
        organizationId,
      );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Stripe onboarding error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create Stripe onboarding link.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Stripe Connect Status
|--------------------------------------------------------------------------
*/

export async function status(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const organizationId = String(
      req.params.organizationId ?? "",
    ).trim();

    const organization =
      await prisma.organization.findFirst({
        where: {
          id: organizationId,
          ownerId: userId,
        },
      });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    const result =
      await getOrganizationStripeStatus(
        organizationId,
      );

    return res.json({
      success: true,
      stripe: result,
    });
  } catch (error) {
    console.error(
      "Stripe status error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to retrieve Stripe status.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Stripe Express Dashboard
|--------------------------------------------------------------------------
*/

export async function dashboard(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const organizationId = String(
      req.params.organizationId ?? "",
    ).trim();

    const organization =
      await prisma.organization.findFirst({
        where: {
          id: organizationId,
          ownerId: userId,
        },
      });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    const result =
      await createLoginLink(
        organizationId,
      );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Stripe dashboard error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create Stripe dashboard link.",
    });
  }
}