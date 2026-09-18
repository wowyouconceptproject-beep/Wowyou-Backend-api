"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plans = plans;
exports.subscription = subscription;
exports.checkout = checkout;
const billing_service_1 = require("./billing.service");
const prisma_1 = require("../../lib/prisma");
/*
|--------------------------------------------------------------------------
| Supported Billing Countries
|--------------------------------------------------------------------------
|
| WOWYOU is positioned as an international / European event platform.
|
| GB  → United Kingdom
| US  → United States
| EU  → European Union / Euro
| CH  → Switzerland
| NO  → Norway
| SE  → Sweden
| DK  → Denmark
|
*/
const BILLING_COUNTRIES = [
    "GB",
    "US",
    "EU",
    "CH",
    "NO",
    "SE",
    "DK",
];
/*
|--------------------------------------------------------------------------
| Supported Billing Intervals
|--------------------------------------------------------------------------
*/
const BILLING_INTERVALS = [
    "MONTH",
    "YEAR",
];
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
        /*
        |--------------------------------------------------------------------------
        | Find Organization
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
        | Get Subscription
        |--------------------------------------------------------------------------
        */
        const result = await (0, billing_service_1.getOrganizationSubscription)(organization.id);
        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */
        return res.json({
            success: true,
            subscription: result,
        });
    }
    catch (error) {
        console.error("ORGANIZER SUBSCRIPTION ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error.message ||
                "Unable to load subscription.",
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
        const { plan, country, interval, fullName, email, redirectUrl, } = req.body;
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
        | Validate Billing Country
        |--------------------------------------------------------------------------
        */
        if (!country ||
            !BILLING_COUNTRIES.includes(country)) {
            return res.status(400).json({
                success: false,
                message: "Invalid billing country.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Validate Billing Interval
        |--------------------------------------------------------------------------
        */
        if (!interval ||
            !BILLING_INTERVALS.includes(interval)) {
            return res.status(400).json({
                success: false,
                message: "Invalid billing interval. Choose MONTH or YEAR.",
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
        | Validate Email Format
        |--------------------------------------------------------------------------
        */
        const normalizedEmail = email
            .trim()
            .toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address.",
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
        | Create Subscription Checkout
        |--------------------------------------------------------------------------
        |
        | Pricing is resolved by:
        |
        | country
        | plan
        | interval
        |
        | Stripe handles the recurring subscription.
        |
        */
        const result = await (0, billing_service_1.createSubscriptionCheckout)({
            organizationId: organization.id,
            plan,
            country,
            interval,
            fullName: fullName.trim(),
            email: normalizedEmail,
            redirectUrl: redirectUrl.trim(),
        });
        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        |
        | Stripe replaces the previous Revolut checkout response.
        |
        | The webhook remains authoritative for the actual subscription
        | status. This response only provides the Checkout information
        | needed by the frontend to redirect the organizer.
        |
        */
        return res.status(200).json({
            success: true,
            checkoutUrl: result.checkoutUrl,
            subscriptionId: result.subscription.id,
            stripeSessionId: result.stripeSessionId,
            stripePriceId: result.stripePriceId,
            pricing: result.pricing,
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
