"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireActiveSubscription = requireActiveSubscription;
exports.requireFeature = requireFeature;
const client_1 = require("@prisma/client");
const billing_plans_1 = require("./billing.plans");
const prisma_1 = require("../../lib/prisma");
/*
|--------------------------------------------------------------------------
| Require Active Organizer Subscription
|--------------------------------------------------------------------------
|
| Allows requests only when the authenticated user's organization has
| an ACTIVE or TRIALING subscription.
|
*/
async function requireActiveSubscription(req, res, next) {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        const organization = await prisma_1.prisma.organization.findUnique({
            where: {
                ownerId: req.user.userId,
            },
        });
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization not found.",
            });
        }
        const subscription = await prisma_1.prisma.organizationSubscription.findUnique({
            where: {
                organizationId: organization.id,
            },
        });
        if (!subscription) {
            return res.status(402).json({
                success: false,
                code: "SUBSCRIPTION_REQUIRED",
                message: "An active organizer subscription is required.",
            });
        }
        const active = subscription.status ===
            client_1.SubscriptionStatus.ACTIVE ||
            subscription.status ===
                client_1.SubscriptionStatus.TRIALING;
        if (!active) {
            return res.status(402).json({
                success: false,
                code: "SUBSCRIPTION_INACTIVE",
                message: "Your organizer subscription is not active.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Attach subscription to request
        |--------------------------------------------------------------------------
        */
        req.organization =
            organization;
        req.subscription =
            subscription;
        next();
    }
    catch (error) {
        console.error("SUBSCRIPTION MIDDLEWARE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to verify subscription.",
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
function requireFeature(feature) {
    return async (req, res, next) => {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required.",
                });
            }
            const organization = await prisma_1.prisma.organization.findUnique({
                where: {
                    ownerId: req.user.userId,
                },
            });
            if (!organization) {
                return res.status(404).json({
                    success: false,
                    message: "Organization not found.",
                });
            }
            const subscription = await prisma_1.prisma.organizationSubscription.findUnique({
                where: {
                    organizationId: organization.id,
                },
            });
            if (!subscription) {
                return res.status(402).json({
                    success: false,
                    code: "SUBSCRIPTION_REQUIRED",
                    message: "An active organizer subscription is required.",
                });
            }
            const active = subscription.status ===
                client_1.SubscriptionStatus.ACTIVE ||
                subscription.status ===
                    client_1.SubscriptionStatus.TRIALING;
            if (!active) {
                return res.status(402).json({
                    success: false,
                    code: "SUBSCRIPTION_INACTIVE",
                    message: "Your organizer subscription is not active.",
                });
            }
            /*
            |--------------------------------------------------------------------------
            | Plan Feature
            |--------------------------------------------------------------------------
            */
            const config = billing_plans_1.ORGANIZER_PLANS[subscription.plan];
            if (!config) {
                return res.status(403).json({
                    success: false,
                    code: "INVALID_SUBSCRIPTION_PLAN",
                    message: "Your subscription plan is invalid.",
                });
            }
            if (!config.features.includes(feature)) {
                return res.status(403).json({
                    success: false,
                    code: "FEATURE_NOT_AVAILABLE",
                    feature,
                    plan: subscription.plan,
                    message: "Your current plan does not include this feature.",
                });
            }
            req.organization =
                organization;
            req.subscription =
                subscription;
            next();
        }
        catch (error) {
            console.error("SUBSCRIPTION FEATURE MIDDLEWARE ERROR:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to verify subscription feature.",
            });
        }
    };
}
