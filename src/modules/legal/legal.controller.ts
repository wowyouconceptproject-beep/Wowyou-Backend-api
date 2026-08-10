import {
  Request,
  Response,
} from "express";

import {
  AuthRequest,
} from "../auth/auth.middleware";

import {
  recordLegalConsent,
  hasCurrentConsent,
  getCurrentPolicies,
  getCurrentCookiePolicy,
} from "./legal.service";

export async function acceptPolicies(
  req: AuthRequest,
  res: Response,
) {
  try {
    const user = req.user;

    if (!user?.userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const fullName =
      req.body.fullName;

    const email =
      req.body.email;

    const role =
      req.body.role;

    const deviceVersion =
      req.body.deviceVersion;

    const consentSource =
      req.body.consentSource ??
      "ATTENDEE_APP";

    const policiesAccepted =
      req.body.policiesAccepted;

    if (
      !fullName ||
      !email ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Full name, email and role are required.",
      });
    }

    const forwardedFor =
      req.headers[
        "x-forwarded-for"
      ];

    const ipAddress =
      typeof forwardedFor ===
      "string"
        ? forwardedFor
            .split(",")[0]
            .trim()
        : req.ip;

    const consent =
      await recordLegalConsent({
        userId:
          user.userId,

        fullName,

        email,

        role,

        consentType:
          "POLICY",

        ipAddress,

        deviceVersion,

        consentSource,

        policiesAccepted:
          policiesAccepted ??
          undefined,

        consentStatus:
          "ACCEPTED",

        reacceptanceRequired:
          false,
      });

    return res.status(201).json({
      success: true,

      message:
        "Platform policies accepted.",

      consent: {
        id:
          consent.id,

        consentType:
          consent.consentType,

        policyVersion:
          consent.policyVersion,

        acceptedAt:
          consent.acceptedAt,

        consentStatus:
          consent.consentStatus,

        consentSource:
          consent.consentSource,

        reacceptanceRequired:
          consent.reacceptanceRequired,
      },
    });
  } catch (error: any) {
    console.error(
      "Legal consent error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to record policy acceptance.",
    });
  }
}

export async function getConsentStatus(
  req: AuthRequest,
  res: Response,
) {
  try {
    const user = req.user;

    if (!user?.userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const consent =
      await hasCurrentConsent(
        user.userId,
        "POLICY",
      );

    return res.json({
      success: true,

      accepted:
        consent != null,

      consent: consent
        ? {
            id:
              consent.id,

            consentType:
              consent.consentType,

            policyVersion:
              consent.policyVersion,

            acceptedAt:
              consent.acceptedAt,

            consentStatus:
              consent.consentStatus,

            consentSource:
              consent.consentSource,

            reacceptanceRequired:
              consent.reacceptanceRequired,
          }
        : null,
    });
  } catch (error: any) {
    console.error(
      "Legal consent status error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load policy consent status.",
    });
  }
}

export async function getPolicies(
  _req: Request,
  res: Response,
) {
  return res.json({
    success: true,
    ...getCurrentPolicies(),
  });
}

export async function acceptCookieConsent(
  req: Request,
  res: Response,
) {
  try {
    const {
      userId,
      fullName,
      email,
      role,
      deviceVersion,
      consentSource,
      cookieCategories,
      consentStatus,
    } = req.body;

    if (!consentStatus) {
      return res.status(400).json({
        success: false,
        message:
          "Consent status is required.",
      });
    }

    const allowedStatuses = [
      "ACCEPTED_ALL",
      "REJECTED_NON_ESSENTIAL",
      "CUSTOMISED",
    ];

    if (
      !allowedStatuses.includes(
        consentStatus,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid cookie consent status.",
      });
    }

    const forwardedFor =
      req.headers[
        "x-forwarded-for"
      ];

    const ipAddress =
      typeof forwardedFor ===
      "string"
        ? forwardedFor
            .split(",")[0]
            .trim()
        : req.ip;

    const categories =
      cookieCategories ?? {};

    const consent =
      await recordLegalConsent({
        userId,

        fullName,

        email,

        role,

        consentType:
          "COOKIE",

        ipAddress,

        deviceVersion,

        consentSource:
          consentSource ??
          "WEBSITE",

        cookieCategories:
          categories,

        consentStatus,

        reacceptanceRequired:
          false,
      });

    return res.status(201).json({
      success: true,

      message:
        "Cookie preferences saved.",

      consent: {
        id:
          consent.id,

        consentType:
          consent.consentType,

        policyVersion:
          consent.policyVersion,

        acceptedAt:
          consent.acceptedAt,

        consentStatus:
          consent.consentStatus,

        cookieCategories:
          consent.cookieCategories,

        consentSource:
          consent.consentSource,
      },
    });
  } catch (error: any) {
    console.error(
      "Cookie consent error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to save cookie preferences.",
    });
  }
}

export async function getCookieConsentStatus(
  req: AuthRequest,
  res: Response,
) {
  try {
    const user = req.user;

    if (!user?.userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const consent =
      await hasCurrentConsent(
        user.userId,
        "COOKIE",
      );

    return res.json({
      success: true,

      accepted:
        consent != null,

      consent: consent
        ? {
            id:
              consent.id,

            consentType:
              consent.consentType,

            policyVersion:
              consent.policyVersion,

            acceptedAt:
              consent.acceptedAt,

            consentStatus:
              consent.consentStatus,

            cookieCategories:
              consent.cookieCategories,

            consentSource:
              consent.consentSource,

            withdrawnAt:
              consent.withdrawnAt,
          }
        : null,
    });
  } catch (error: any) {
    console.error(
      "Cookie consent status error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load cookie consent status.",
    });
  }
}

export async function getCookiePolicy(
  _req: Request,
  res: Response,
) {
  return res.json({
    success: true,
    ...getCurrentCookiePolicy(),
  });
}