"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORGANIZER_TRIAL_DAYS = void 0;
exports.getOrganizationSubscription = getOrganizationSubscription;
exports.getPlans = getPlans;
exports.getPlan = getPlan;
exports.getPlanPricing = getPlanPricing;
exports.isSubscriptionActive = isSubscriptionActive;
exports.organizationHasFeature = organizationHasFeature;
exports.createOrganizationTrial = createOrganizationTrial;
exports.createInitialSubscription = createInitialSubscription;
exports.createSubscriptionCheckout = createSubscriptionCheckout;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const billing_plans_1 = require("./billing.plans");
const billing_pricing_1 = require("./billing.pricing");
const stripe_service_1 = require("../payments/stripe/stripe.service");
/*
|--------------------------------------------------------------------------
| Trial Configuration
|--------------------------------------------------------------------------
*/
exports.ORGANIZER_TRIAL_DAYS = 14;
/*
|--------------------------------------------------------------------------
| Default Billing Configuration
|--------------------------------------------------------------------------
*/
const DEFAULT_BILLING_COUNTRY = "GB";
const DEFAULT_BILLING_INTERVAL = "MONTH";
/*
|--------------------------------------------------------------------------
| Get Organization Subscription
|--------------------------------------------------------------------------
*/
async function getOrganizationSubscription(organizationId) {
    return prisma_1.prisma.organizationSubscription.findUnique({
        where: {
            organizationId,
        },
    });
}
/*
|--------------------------------------------------------------------------
| Get Plans
|--------------------------------------------------------------------------
|
| Returns plan metadata only.
|
| Pricing is resolved separately through billing.pricing.ts.
|
*/
function getPlans() {
    return Object.values(billing_plans_1.ORGANIZER_PLANS);
}
/*
|--------------------------------------------------------------------------
| Get Plan
|--------------------------------------------------------------------------
*/
function getPlan(plan) {
    return billing_plans_1.ORGANIZER_PLANS[plan];
}
/*
|--------------------------------------------------------------------------
| Get Plan Pricing
|--------------------------------------------------------------------------
|
| Pricing is resolved using:
|
| country + plan + interval
|
*/
function getPlanPricing(country, plan, interval) {
    const countryPricing = billing_pricing_1.ORGANIZER_PRICING[country];
    if (!countryPricing) {
        throw new Error(`Billing is not available for country ${country}.`);
    }
    const planPricing = countryPricing[plan];
    if (!planPricing) {
        throw new Error(`Pricing is not configured for ${plan} in ${country}.`);
    }
    const pricing = planPricing[interval];
    if (!pricing) {
        throw new Error(`Pricing is not configured for ${plan} in ${country} for ${interval} billing.`);
    }
    return pricing;
}
/*
|--------------------------------------------------------------------------
| Subscription Active Check
|--------------------------------------------------------------------------
*/
function isSubscriptionActive(subscription) {
    /*
    |--------------------------------------------------------------------------
    | Paid Active Subscription
    |--------------------------------------------------------------------------
    */
    if (subscription.status ===
        client_1.SubscriptionStatus.ACTIVE) {
        return true;
    }
    /*
    |--------------------------------------------------------------------------
    | Active Trial
    |--------------------------------------------------------------------------
    */
    if (subscription.status ===
        client_1.SubscriptionStatus.TRIALING) {
        if (!subscription.currentPeriodEnd) {
            return false;
        }
        return (subscription.currentPeriodEnd >
            new Date());
    }
    return false;
}
/*
|--------------------------------------------------------------------------
| Organization Feature Access
|--------------------------------------------------------------------------
*/
async function organizationHasFeature(organizationId, feature) {
    const subscription = await getOrganizationSubscription(organizationId);
    if (!subscription) {
        return false;
    }
    if (!isSubscriptionActive(subscription)) {
        return false;
    }
    const config = billing_plans_1.ORGANIZER_PLANS[subscription.plan];
    if (!config) {
        return false;
    }
    return config.features.includes(feature);
}
/*
|--------------------------------------------------------------------------
| Create Organization Trial
|--------------------------------------------------------------------------
*/
async function createOrganizationTrial(organizationId, plan = client_1.OrganizerPlan.STARTER, country = DEFAULT_BILLING_COUNTRY, interval = DEFAULT_BILLING_INTERVAL) {
    /*
    |--------------------------------------------------------------------------
    | Validate Plan
    |--------------------------------------------------------------------------
    */
    const config = billing_plans_1.ORGANIZER_PLANS[plan];
    if (!config) {
        throw new Error("Invalid organizer plan.");
    }
    /*
    |--------------------------------------------------------------------------
    | Resolve Pricing
    |--------------------------------------------------------------------------
    */
    const pricing = getPlanPricing(country, plan, interval);
    /*
    |--------------------------------------------------------------------------
    | Existing Subscription
    |--------------------------------------------------------------------------
    */
    const existing = await getOrganizationSubscription(organizationId);
    /*
    |--------------------------------------------------------------------------
    | Do Not Reset Existing Subscription
    |--------------------------------------------------------------------------
    */
    if (existing) {
        return existing;
    }
    /*
    |--------------------------------------------------------------------------
    | Trial Dates
    |--------------------------------------------------------------------------
    */
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() +
        exports.ORGANIZER_TRIAL_DAYS);
    /*
    |--------------------------------------------------------------------------
    | Create Trial
    |--------------------------------------------------------------------------
    */
    return prisma_1.prisma.organizationSubscription.create({
        data: {
            organizationId,
            plan,
            status: client_1.SubscriptionStatus.TRIALING,
            currency: pricing.currency,
            amount: pricing.amount,
            interval,
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
            cancelAtPeriodEnd: false,
            /*
            |--------------------------------------------------------------------------
            | No Stripe Subscription Yet
            |--------------------------------------------------------------------------
            */
            provider: null,
            providerCustomerId: null,
            providerSubscriptionId: null,
            providerPriceId: null,
            providerSetupOrderId: null,
            canceledAt: null,
        },
    });
}
/*
|--------------------------------------------------------------------------
| Create Initial Subscription
|--------------------------------------------------------------------------
|
| Creates or resets the local subscription record
| before Stripe Checkout is created.
|
*/
async function createInitialSubscription(organizationId, plan = client_1.OrganizerPlan.STARTER, country = DEFAULT_BILLING_COUNTRY, interval = DEFAULT_BILLING_INTERVAL) {
    /*
    |--------------------------------------------------------------------------
    | Validate Plan
    |--------------------------------------------------------------------------
    */
    const config = billing_plans_1.ORGANIZER_PLANS[plan];
    if (!config) {
        throw new Error("Invalid organizer plan.");
    }
    /*
    |--------------------------------------------------------------------------
    | Resolve Pricing
    |--------------------------------------------------------------------------
    */
    const pricing = getPlanPricing(country, plan, interval);
    /*
    |--------------------------------------------------------------------------
    | Create / Reset Local Subscription
    |--------------------------------------------------------------------------
    |
    | Stripe has not completed payment yet.
    |
    | Therefore:
    |
    | PENDING
    |
    |--------------------------------------------------------------------------
    */
    return prisma_1.prisma.organizationSubscription.upsert({
        where: {
            organizationId,
        },
        create: {
            organizationId,
            plan,
            status: client_1.SubscriptionStatus.PENDING,
            currency: pricing.currency,
            amount: pricing.amount,
            interval,
            provider: "STRIPE",
            providerCustomerId: null,
            providerSubscriptionId: null,
            providerPriceId: null,
            providerSetupOrderId: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            canceledAt: null,
        },
        update: {
            plan,
            status: client_1.SubscriptionStatus.PENDING,
            currency: pricing.currency,
            amount: pricing.amount,
            interval,
            provider: "STRIPE",
            providerCustomerId: null,
            providerSubscriptionId: null,
            providerPriceId: null,
            providerSetupOrderId: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            canceledAt: null,
        },
    });
}
/*
|--------------------------------------------------------------------------
| Create Organizer Subscription Checkout
|--------------------------------------------------------------------------
|
| Stripe owns:
|
| - Customer creation
| - Recurring subscription
| - Payment method
| - Recurring invoices
| - Subscription lifecycle
|
| WowYou owns:
|
| - OrganizationSubscription
| - Feature access
| - Platform entitlement
|
|--------------------------------------------------------------------------
*/
async function createSubscriptionCheckout(data) {
    /*
    |--------------------------------------------------------------------------
    | Normalize Request Values
    |--------------------------------------------------------------------------
    */
    const organizationId = String(data.organizationId ?? "").trim();
    const fullName = String(data.fullName ?? "").trim();
    const email = String(data.email ?? "")
        .trim()
        .toLowerCase();
    const redirectUrl = String(data.redirectUrl ?? "").trim();
    /*
    |--------------------------------------------------------------------------
    | Validate Organization
    |--------------------------------------------------------------------------
    */
    if (!organizationId) {
        throw new Error("Organization ID is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Name
    |--------------------------------------------------------------------------
    */
    if (!fullName) {
        throw new Error("Organizer full name is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Email
    |--------------------------------------------------------------------------
    */
    if (!email) {
        throw new Error("Organizer email is required.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("A valid organizer email is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Redirect URL
    |--------------------------------------------------------------------------
    */
    if (!redirectUrl) {
        throw new Error("Billing redirect URL is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Plan
    |--------------------------------------------------------------------------
    */
    const config = billing_plans_1.ORGANIZER_PLANS[data.plan];
    if (!config) {
        throw new Error("Invalid organizer plan.");
    }
    /*
    |--------------------------------------------------------------------------
    | Resolve Pricing
    |--------------------------------------------------------------------------
    */
    const pricing = getPlanPricing(data.country, data.plan, data.interval);
    /*
    |--------------------------------------------------------------------------
    | Existing Subscription
    |--------------------------------------------------------------------------
    */
    const existing = await getOrganizationSubscription(organizationId);
    /*
    |--------------------------------------------------------------------------
    | Active Paid Subscription
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | ACTIVE means there is already a paid Stripe
    | subscription.
    |
    | We must not create another subscription.
    |
    | TRIALING is deliberately NOT blocked here.
    |
    | A user on a WowYou trial must be able to
    | transition into the Stripe paid subscription.
    |
    */
    if (existing &&
        existing.status ===
            client_1.SubscriptionStatus.ACTIVE) {
        throw new Error("Organization already has an active subscription.");
    }
    /*
    |--------------------------------------------------------------------------
    | Create / Update Pending Local Subscription
    |--------------------------------------------------------------------------
    */
    const subscription = await createInitialSubscription(organizationId, data.plan, data.country, data.interval);
    /*
    |--------------------------------------------------------------------------
    | Create Stripe Checkout
    |--------------------------------------------------------------------------
    */
    try {
        const checkout = await (0, stripe_service_1.createStripeOrganizerSubscriptionCheckout)({
            /*
            |--------------------------------------------------------------------------
            | WowYou Subscription
            |--------------------------------------------------------------------------
            */
            organizationSubscriptionId: subscription.id,
            organizationId,
            /*
            |--------------------------------------------------------------------------
            | Plan
            |--------------------------------------------------------------------------
            */
            plan: data.plan,
            /*
            |--------------------------------------------------------------------------
            | Billing Country
            |--------------------------------------------------------------------------
            */
            country: data.country,
            /*
            |--------------------------------------------------------------------------
            | Billing Interval
            |--------------------------------------------------------------------------
            */
            interval: data.interval,
            /*
            |--------------------------------------------------------------------------
            | Organizer
            |--------------------------------------------------------------------------
            */
            fullName,
            email,
            /*
            |--------------------------------------------------------------------------
            | Pricing
            |--------------------------------------------------------------------------
            */
            amount: pricing.amount,
            currency: pricing.currency,
            /*
            |--------------------------------------------------------------------------
            | Stripe Redirects
            |--------------------------------------------------------------------------
            */
            successUrl: redirectUrl,
            cancelUrl: redirectUrl,
        });
        /*
        |--------------------------------------------------------------------------
        | Store Stripe Price Reference
        |--------------------------------------------------------------------------
        |
        | The Price is created/reused by stripe.service.ts.
        |
        | The actual Stripe Subscription ID and Customer ID
        | are populated later by the webhook.
        |
        |--------------------------------------------------------------------------
        */
        const updated = await prisma_1.prisma.organizationSubscription.update({
            where: {
                id: subscription.id,
            },
            data: {
                status: client_1.SubscriptionStatus.PENDING,
                provider: "STRIPE",
                providerPriceId: checkout.priceId,
                providerSetupOrderId: null,
            },
        });
        /*
        |--------------------------------------------------------------------------
        | Return Checkout
        |--------------------------------------------------------------------------
        */
        return {
            subscription: updated,
            checkoutUrl: checkout.checkoutUrl,
            stripeSessionId: checkout.sessionId,
            stripePriceId: checkout.priceId,
            pricing: {
                amount: pricing.amount,
                currency: pricing.currency,
                interval: data.interval,
                country: data.country,
                plan: data.plan,
            },
        };
    }
    catch (error) {
        /*
        |--------------------------------------------------------------------------
        | Stripe Checkout Failed
        |--------------------------------------------------------------------------
        |
        | Keep the local subscription PENDING so the billing
        | attempt remains traceable.
        |
        |--------------------------------------------------------------------------
        */
        console.error("STRIPE ORGANIZER SUBSCRIPTION CHECKOUT ERROR:", error);
        throw error;
    }
}
