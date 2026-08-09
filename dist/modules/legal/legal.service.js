"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordLegalConsent = recordLegalConsent;
exports.hasCurrentConsent = hasCurrentConsent;
exports.getCurrentPolicies = getCurrentPolicies;
const prisma_1 = require("../../lib/prisma");
const legal_constants_1 = require("./legal.constants");
async function recordLegalConsent(input) {
    const consent = await prisma_1.prisma.legalConsent.create({
        data: {
            userId: input.userId,
            fullName: input.fullName,
            email: input.email,
            role: input.role,
            policyVersion: legal_constants_1.CURRENT_POLICY_VERSION,
            acceptedAt: new Date(),
            ipAddress: input.ipAddress,
            deviceVersion: input.deviceVersion,
            policiesAccepted: [...legal_constants_1.CURRENT_POLICIES],
            consentStatus: "ACCEPTED",
            reacceptanceRequired: false,
        },
    });
    return consent;
}
async function hasCurrentConsent(userId) {
    const consent = await prisma_1.prisma.legalConsent.findFirst({
        where: {
            userId,
            policyVersion: legal_constants_1.CURRENT_POLICY_VERSION,
            consentStatus: "ACCEPTED",
            reacceptanceRequired: false,
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
        policies: [...legal_constants_1.CURRENT_POLICIES],
    };
}
