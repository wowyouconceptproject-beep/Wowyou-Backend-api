import { prisma } from "../../lib/prisma";

import {
  CURRENT_COOKIE_POLICY_VERSION,
  CURRENT_POLICIES,
  CURRENT_POLICY_VERSION,
  COOKIE_CATEGORIES,
} from "./legal.constants";

interface RecordConsentInput {
  userId?: string;
  fullName?: string;
  email?: string;
  role?: string;

  consentType?: "POLICY" | "COOKIE";

  ipAddress?: string;
  deviceVersion?: string;
  consentSource?: string;

  policiesAccepted?: Record<string, boolean>;

  cookieCategories?: Record<string, boolean>;

  consentStatus?:
    | "ACCEPTED"
    | "ACCEPTED_ALL"
    | "REJECTED_NON_ESSENTIAL"
    | "CUSTOMISED";

  reacceptanceRequired?: boolean;
}

export async function recordLegalConsent(
  input: RecordConsentInput,
) {
  const consentType =
    input.consentType ?? "POLICY";

  const isCookieConsent =
    consentType === "COOKIE";

  const policyVersion = isCookieConsent
    ? CURRENT_COOKIE_POLICY_VERSION
    : CURRENT_POLICY_VERSION;

  const consent =
    await prisma.legalConsent.create({
      data: {
        userId: input.userId,

        fullName: input.fullName,
        email: input.email,
        role: input.role,

        consentType,

        policyVersion,

        acceptedAt: new Date(),

        ipAddress: input.ipAddress,

        deviceVersion: input.deviceVersion,

        consentSource:
          input.consentSource,

        ...(input.policiesAccepted !==
        undefined
          ? {
              policiesAccepted:
                input.policiesAccepted,
            }
          : {}),

        ...(input.cookieCategories !==
        undefined
          ? {
              cookieCategories:
                input.cookieCategories,
            }
          : {}),

        consentStatus:
          input.consentStatus ??
          "ACCEPTED",

        strictlyNecessary: true,

        reacceptanceRequired:
          input.reacceptanceRequired ??
          false,
      },
    });

  return consent;
}

export async function hasCurrentConsent(
  userId: string,
  consentType:
    | "POLICY"
    | "COOKIE" = "POLICY",
) {
  const policyVersion =
    consentType === "COOKIE"
      ? CURRENT_COOKIE_POLICY_VERSION
      : CURRENT_POLICY_VERSION;

  const consent =
    await prisma.legalConsent.findFirst({
      where: {
        userId,
        consentType,
        policyVersion,

        consentStatus:
          consentType === "POLICY"
            ? "ACCEPTED"
            : {
                in: [
                  "ACCEPTED",
                  "ACCEPTED_ALL",
                  "REJECTED_NON_ESSENTIAL",
                  "CUSTOMISED",
                ],
              },

        reacceptanceRequired: false,

        withdrawnAt: null,
      },

      orderBy: {
        acceptedAt: "desc",
      },
    });

  return consent;
}

export function getCurrentPolicies() {
  return {
    version:
      CURRENT_POLICY_VERSION,

    policies:
      CURRENT_POLICIES.map(
        (policy) => ({
          key: policy.key,
          name: policy.name,
          required: policy.required,
        }),
      ),
  };
}

export function getCurrentCookiePolicy() {
  return {
    version:
      CURRENT_COOKIE_POLICY_VERSION,

    categories:
      COOKIE_CATEGORIES.map(
        (category) => ({
          key: category.key,
          name: category.name,
          required:
            category.required,
        }),
      ),
  };
}