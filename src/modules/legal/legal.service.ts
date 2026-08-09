import { prisma } from "../../lib/prisma";

import {
  CURRENT_POLICIES,
  CURRENT_POLICY_VERSION,
} from "./legal.constants";

interface RecordConsentInput {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  ipAddress?: string;
  deviceVersion?: string;
}

export async function recordLegalConsent(
  input: RecordConsentInput,
) {
  const consent =
    await prisma.legalConsent.create({
      data: {
        userId:
          input.userId,

        fullName:
          input.fullName,

        email:
          input.email,

        role:
          input.role,

        policyVersion:
          CURRENT_POLICY_VERSION,

        acceptedAt:
          new Date(),

        ipAddress:
          input.ipAddress,

        deviceVersion:
          input.deviceVersion,

        policiesAccepted:
          [...CURRENT_POLICIES],

        consentStatus:
          "ACCEPTED",

        reacceptanceRequired:
          false,
      },
    });

  return consent;
}

export async function hasCurrentConsent(
  userId: string,
) {
  const consent =
    await prisma.legalConsent.findFirst({
      where: {
        userId,
        policyVersion:
          CURRENT_POLICY_VERSION,
        consentStatus:
          "ACCEPTED",
        reacceptanceRequired:
          false,
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
      [...CURRENT_POLICIES],
  };
}