"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptPolicies = acceptPolicies;
exports.getConsentStatus = getConsentStatus;
exports.getPolicies = getPolicies;
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
            ipAddress,
            deviceVersion,
        });
        return res.status(201).json({
            success: true,
            message: "Platform policies accepted.",
            consent: {
                id: consent.id,
                policyVersion: consent.policyVersion,
                acceptedAt: consent.acceptedAt,
                consentStatus: consent.consentStatus,
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
        const consent = await (0, legal_service_1.hasCurrentConsent)(user.userId);
        return res.json({
            success: true,
            accepted: consent != null,
            consent: consent
                ? {
                    id: consent.id,
                    policyVersion: consent.policyVersion,
                    acceptedAt: consent.acceptedAt,
                    consentStatus: consent.consentStatus,
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
