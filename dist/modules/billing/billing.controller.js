"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plans = plans;
exports.subscription = subscription;
exports.checkout = checkout;
const billing_service_1 = require("./billing.service");
const prisma_1 = require("../../lib/prisma");
/*
|--------------------------------------------------------------------------
| Plans
|--------------------------------------------------------------------------
*/
async function plans(_req, res) {
    return res.json({
        success: true,
        plans: (0, billing_service_1.getPlans)(),
    });
}
/*
|--------------------------------------------------------------------------
| Current Subscription
|--------------------------------------------------------------------------
*/
async function subscription(req, res) {
    try {
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
        const result = await (0, billing_service_1.getOrganizationSubscription)(organization.id);
        return res.json({
            success: true,
            subscription: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
|--------------------------------------------------------------------------
| Checkout
|--------------------------------------------------------------------------
*/
async function checkout(req, res) {
    try {
        const { plan, fullName, email, redirectUrl, } = req.body;
        /*
        |--------------------------------------------------------------------------
        | Validate Plan
        |--------------------------------------------------------------------------
        */
        if (!plan ||
            !(0, billing_service_1.getPlan)(plan)) {
            return res.status(400).json({
                success: false,
                message: "Invalid organizer plan.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Validate Customer Details
        |--------------------------------------------------------------------------
        */
        if (!fullName ||
            !fullName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Full name is required.",
            });
        }
        if (!email ||
            !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Validate Redirect URL
        |--------------------------------------------------------------------------
        */
        if (!redirectUrl ||
            !redirectUrl.trim()) {
            return res.status(400).json({
                success: false,
                message: "Redirect URL is required.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Organization
        |--------------------------------------------------------------------------
        */
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
        /*
        |--------------------------------------------------------------------------
        | Create Revolut Checkout
        |--------------------------------------------------------------------------
        */
        const result = await (0, billing_service_1.createSubscriptionCheckout)({
            organizationId: organization.id,
            plan,
            fullName: fullName.trim(),
            email: email.trim()
                .toLowerCase(),
            redirectUrl: redirectUrl.trim(),
        });
        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */
        return res.status(200).json({
            success: true,
            checkoutUrl: result.checkoutUrl,
            subscriptionId: result.subscription.id,
            revolutSubscriptionId: result.revolutSubscriptionId,
            setupOrderId: result.setupOrderId,
        });
    }
    catch (error) {
        console.error("ORGANIZER BILLING CHECKOUT ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error.message ||
                "Unable to create checkout.",
        });
    }
}
