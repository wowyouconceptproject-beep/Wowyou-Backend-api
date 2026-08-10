"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordLegalConsent = recordLegalConsent;
exports.hasCurrentConsent = hasCurrentConsent;
exports.getCurrentPolicies = getCurrentPolicies;
exports.getCurrentCookiePolicy = getCurrentCookiePolicy;
const prisma_1 = require("../../lib/prisma");
const legal_constants_1 = require("./legal.constants");
async function recordLegalConsent(input) {
    const consentType = input.consentType ?? "POLICY";
    const isCookieConsent = consentType === "COOKIE";
    const policyVersion = isCookieConsent
        ? legal_constants_1.CURRENT_COOKIE_POLICY_VERSION
        : legal_constants_1.CURRENT_POLICY_VERSION;
    const consent = await prisma_1.prisma.legalConsent.create({
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
            consentSource: input.consentSource,
            ...(input.policiesAccepted !==
                undefined
                ? {
                    policiesAccepted: input.policiesAccepted,
                }
                : {}),
            ...(input.cookieCategories !==
                undefined
                ? {
                    cookieCategories: input.cookieCategories,
                }
                : {}),
            consentStatus: input.consentStatus ??
                "ACCEPTED",
            strictlyNecessary: true,
            reacceptanceRequired: input.reacceptanceRequired ??
                false,
        },
    });
    return consent;
}
async function hasCurrentConsent(userId, consentType = "POLICY") {
    const policyVersion = consentType === "COOKIE"
        ? legal_constants_1.CURRENT_COOKIE_POLICY_VERSION
        : legal_constants_1.CURRENT_POLICY_VERSION;
    const consent = await prisma_1.prisma.legalConsent.findFirst({
        where: {
            userId,
            consentType,
            policyVersion,
            consentStatus: consentType === "POLICY"
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
function getCurrentPolicies() {
    return {
        version: legal_constants_1.CURRENT_POLICY_VERSION,
        policies: legal_constants_1.CURRENT_POLICIES.map((policy) => ({
            key: policy.key,
            name: policy.name,
            required: policy.required,
        })),
    };
}
function getCurrentCookiePolicy() {
    return {
        version: legal_constants_1.CURRENT_COOKIE_POLICY_VERSION,
        categories: legal_constants_1.COOKIE_CATEGORIES.map((category) => ({
            key: category.key,
            name: category.name,
            required: category.required,
        })),
    };
}
