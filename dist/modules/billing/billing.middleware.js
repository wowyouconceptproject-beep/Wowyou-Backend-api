"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireActiveSubscription = requireActiveSubscription;
exports.requireFeature = requireFeature;
const billing_plans_1 = require("./billing.plans");
const billing_service_1 = require("./billing.service");
const prisma_1 = require("../../lib/prisma");
/*
|--------------------------------------------------------------------------
| Require Active Organizer Subscription
|--------------------------------------------------------------------------
|
| Allows requests only when the authenticated user's organization has
| an ACTIVE subscription or a non-expired TRIALING subscription.
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
        /*
        |--------------------------------------------------------------------------
        | Verify Active Subscription
        |--------------------------------------------------------------------------
        */
        const active = (0, billing_service_1.isSubscriptionActive)(subscription);
        if (!active) {
            return res.status(402).json({
                success: false,
                code: subscription.status ===
                    "TRIALING"
                    ? "TRIAL_EXPIRED"
                    : "SUBSCRIPTION_INACTIVE",
                message: subscription.status ===
                    "TRIALING"
                    ? "Your 14-day free trial has expired. Please choose a plan to continue."
                    : "Your organizer subscription is not active.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Attach Subscription Context
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
| Requires:
|
| 1. Authentication
| 2. Active subscription OR non-expired trial
| 3. Feature included in the current plan
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
            /*
            |--------------------------------------------------------------------------
            | Verify Active Subscription / Trial
            |--------------------------------------------------------------------------
            */
            const active = (0, billing_service_1.isSubscriptionActive)(subscription);
            if (!active) {
                return res.status(402).json({
                    success: false,
                    code: subscription.status ===
                        "TRIALING"
                        ? "TRIAL_EXPIRED"
                        : "SUBSCRIPTION_INACTIVE",
                    message: subscription.status ===
                        "TRIALING"
                        ? "Your 14-day free trial has expired. Please choose a plan to continue."
                        : "Your organizer subscription is not active.",
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
            /*
            |--------------------------------------------------------------------------
            | Attach Subscription Context
            |--------------------------------------------------------------------------
            */
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
