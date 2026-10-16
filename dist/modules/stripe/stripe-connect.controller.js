"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccount = createAccount;
exports.onboarding = onboarding;
exports.status = status;
exports.dashboard = dashboard;
const stripe_connect_service_1 = require("./stripe-connect.service");
const prisma_1 = require("../../lib/prisma");
/*
|--------------------------------------------------------------------------
| Create Stripe Connect Account
|--------------------------------------------------------------------------
*/
async function createAccount(req, res) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        const organizationId = String(req.body.organizationId ?? "").trim();
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: "organizationId is required.",
            });
        }
        const organization = await prisma_1.prisma.organization.findFirst({
            where: {
                id: organizationId,
                ownerId: userId,
            },
        });
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization not found or you are not the owner.",
            });
        }
        const email = String(req.body.email ?? "").trim();
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "email is required.",
            });
        }
        const businessName = String(req.body.businessName ?? "").trim();
        const country = String(req.body.country ?? "").trim();
        const account = await (0, stripe_connect_service_1.createConnectedAccount)({
            organizationId,
            email,
            businessName: businessName || organization.name,
            country: country || undefined,
        });
        return res.status(200).json({
            success: true,
            message: "Stripe Connect account is ready.",
            account: {
                id: account.id,
                type: account.type,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                detailsSubmitted: account.details_submitted,
            },
        });
    }
    catch (error) {
        console.error("Stripe Connect account creation error:", error);
        const message = error instanceof Error
            ? error.message
            : "Failed to create Stripe Connect account.";
        if (message === "Organization not found.") {
            return res.status(404).json({
                success: false,
                message,
            });
        }
        if (message.includes("A valid email address is required")) {
            return res.status(400).json({
                success: false,
                message,
            });
        }
        return res.status(500).json({
            success: false,
            message,
        });
    }
}
/*
|--------------------------------------------------------------------------
| Start Onboarding
|--------------------------------------------------------------------------
*/
async function onboarding(req, res) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        const organizationId = String(req.body.organizationId ??
            req.query.organizationId ??
            "").trim();
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: "organizationId is required.",
            });
        }
        const organization = await prisma_1.prisma.organization.findFirst({
            where: {
                id: organizationId,
                ownerId: userId,
            },
        });
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization not found or you are not the owner.",
            });
        }
        /*
         * Existing accounts are reused.
         *
         * If an account does not exist, the service creates and persists
         * one before generating the Stripe onboarding link.
         */
        const email = String(req.body.email ?? "").trim();
        const businessName = String(req.body.businessName ?? "").trim();
        const country = String(req.body.country ?? "").trim();
        const result = await (0, stripe_connect_service_1.createOnboardingLink)(organizationId, {
            email: email || undefined,
            businessName: businessName || organization.name,
            country: country || undefined,
        });
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("Stripe onboarding error:", error);
        const message = error instanceof Error
            ? error.message
            : "Failed to create Stripe onboarding link.";
        if (message === "Organization not found.") {
            return res.status(404).json({
                success: false,
                message,
            });
        }
        if (message.includes("A valid email address is required")) {
            return res.status(400).json({
                success: false,
                message,
            });
        }
        return res.status(500).json({
            success: false,
            message,
        });
    }
}
/*
|--------------------------------------------------------------------------
| Stripe Connect Status
|--------------------------------------------------------------------------
*/
async function status(req, res) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        const organizationId = String(req.params.organizationId ?? "").trim();
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: "organizationId is required.",
            });
        }
        const organization = await prisma_1.prisma.organization.findFirst({
            where: {
                id: organizationId,
                ownerId: userId,
            },
        });
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization not found or you are not the owner.",
            });
        }
        const result = await (0, stripe_connect_service_1.getOrganizationStripeStatus)(organizationId);
        return res.status(200).json({
            success: true,
            stripe: result,
        });
    }
    catch (error) {
        console.error("Stripe status error:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error
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
async function dashboard(req, res) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        const organizationId = String(req.params.organizationId ?? "").trim();
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: "organizationId is required.",
            });
        }
        const organization = await prisma_1.prisma.organization.findFirst({
            where: {
                id: organizationId,
                ownerId: userId,
            },
        });
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization not found or you are not the owner.",
            });
        }
        const result = await (0, stripe_connect_service_1.createLoginLink)(organizationId);
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("Stripe dashboard error:", error);
        const message = error instanceof Error
            ? error.message
            : "Failed to create Stripe dashboard link.";
        if (message === "Organization not found.") {
            return res.status(404).json({
                success: false,
                message,
            });
        }
        return res.status(500).json({
            success: false,
            message,
        });
    }
}
