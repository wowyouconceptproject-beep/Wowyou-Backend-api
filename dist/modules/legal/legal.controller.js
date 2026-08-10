"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptPolicies = acceptPolicies;
exports.getConsentStatus = getConsentStatus;
exports.getPolicies = getPolicies;
exports.acceptCookieConsent = acceptCookieConsent;
exports.getCookieConsentStatus = getCookieConsentStatus;
exports.getCookiePolicy = getCookiePolicy;
const legal_service_1 = require("./legal.service");
async function acceptPolicies(req, res) {
    try {
        const user = req.user;
        if (!user?.userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        const fullName = req.body.fullName;
        const email = req.body.email;
        const role = req.body.role;
        const deviceVersion = req.body.deviceVersion;
        const consentSource = req.body.consentSource ??
            "ATTENDEE_APP";
        const policiesAccepted = req.body.policiesAccepted;
        if (!fullName ||
            !email ||
            !role) {
            return res.status(400).json({
                success: false,
                message: "Full name, email and role are required.",
            });
        }
        const forwardedFor = req.headers["x-forwarded-for"];
        const ipAddress = typeof forwardedFor ===
            "string"
            ? forwardedFor
                .split(",")[0]
                .trim()
            : req.ip;
        const consent = await (0, legal_service_1.recordLegalConsent)({
            userId: user.userId,
            fullName,
            email,
            role,
            consentType: "POLICY",
            ipAddress,
            deviceVersion,
            consentSource,
            policiesAccepted: policiesAccepted ??
                undefined,
            consentStatus: "ACCEPTED",
            reacceptanceRequired: false,
        });
        return res.status(201).json({
            success: true,
            message: "Platform policies accepted.",
            consent: {
                id: consent.id,
                consentType: consent.consentType,
                policyVersion: consent.policyVersion,
                acceptedAt: consent.acceptedAt,
                consentStatus: consent.consentStatus,
                consentSource: consent.consentSource,
                reacceptanceRequired: consent.reacceptanceRequired,
            },
        });
    }
    catch (error) {
        console.error("Legal consent error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to record policy acceptance.",
        });
    }
}
async function getConsentStatus(req, res) {
    try {
        const user = req.user;
        if (!user?.userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        const consent = await (0, legal_service_1.hasCurrentConsent)(user.userId, "POLICY");
        return res.json({
            success: true,
            accepted: consent != null,
            consent: consent
                ? {
                    id: consent.id,
                    consentType: consent.consentType,
                    policyVersion: consent.policyVersion,
                    acceptedAt: consent.acceptedAt,
                    consentStatus: consent.consentStatus,
                    consentSource: consent.consentSource,
                    reacceptanceRequired: consent.reacceptanceRequired,
                }
                : null,
        });
    }
    catch (error) {
        console.error("Legal consent status error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load policy consent status.",
        });
    }
}
async function getPolicies(_req, res) {
    return res.json({
        success: true,
        ...(0, legal_service_1.getCurrentPolicies)(),
    });
}
async function acceptCookieConsent(req, res) {
    try {
        const { userId, fullName, email, role, deviceVersion, consentSource, cookieCategories, consentStatus, } = req.body;
        if (!consentStatus) {
            return res.status(400).json({
                success: false,
                message: "Consent status is required.",
            });
        }
        const allowedStatuses = [
            "ACCEPTED_ALL",
            "REJECTED_NON_ESSENTIAL",
            "CUSTOMISED",
        ];
        if (!allowedStatuses.includes(consentStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid cookie consent status.",
            });
        }
        const forwardedFor = req.headers["x-forwarded-for"];
        const ipAddress = typeof forwardedFor ===
            "string"
            ? forwardedFor
                .split(",")[0]
                .trim()
            : req.ip;
        const categories = cookieCategories ?? {};
        const consent = await (0, legal_service_1.recordLegalConsent)({
            userId,
            fullName,
            email,
            role,
            consentType: "COOKIE",
            ipAddress,
            deviceVersion,
            consentSource: consentSource ??
                "WEBSITE",
            cookieCategories: categories,
            consentStatus,
            reacceptanceRequired: false,
        });
        return res.status(201).json({
            success: true,
            message: "Cookie preferences saved.",
            consent: {
                id: consent.id,
                consentType: consent.consentType,
                policyVersion: consent.policyVersion,
                acceptedAt: consent.acceptedAt,
                consentStatus: consent.consentStatus,
                cookieCategories: consent.cookieCategories,
                consentSource: consent.consentSource,
            },
        });
    }
    catch (error) {
        console.error("Cookie consent error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to save cookie preferences.",
        });
    }
}
async function getCookieConsentStatus(req, res) {
    try {
        const user = req.user;
        if (!user?.userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        const consent = await (0, legal_service_1.hasCurrentConsent)(user.userId, "COOKIE");
        return res.json({
            success: true,
            accepted: consent != null,
            consent: consent
                ? {
                    id: consent.id,
                    consentType: consent.consentType,
                    policyVersion: consent.policyVersion,
                    acceptedAt: consent.acceptedAt,
                    consentStatus: consent.consentStatus,
                    cookieCategories: consent.cookieCategories,
                    consentSource: consent.consentSource,
                    withdrawnAt: consent.withdrawnAt,
                }
                : null,
        });
    }
    catch (error) {
        console.error("Cookie consent status error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load cookie consent status.",
        });
    }
}
async function getCookiePolicy(_req, res) {
    return res.json({
        success: true,
        ...(0, legal_service_1.getCurrentCookiePolicy)(),
    });
}
