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
const revolut_service_1 = require("../payments/revolut/revolut.service");
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
    if (subscription.status ===
        client_1.SubscriptionStatus.ACTIVE) {
        return true;
    }
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
    const config = billing_plans_1.ORGANIZER_PLANS[plan];
    if (!config) {
        throw new Error("Invalid organizer plan.");
    }
    const pricing = getPlanPricing(country, plan, interval);
    const existing = await getOrganizationSubscription(organizationId);
    /*
    |--------------------------------------------------------------------------
    | Do Not Reset Existing Subscription
    |--------------------------------------------------------------------------
    */
    if (existing) {
        return existing;
    }
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() +
        exports.ORGANIZER_TRIAL_DAYS);
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
        },
    });
}
/*
|--------------------------------------------------------------------------
| Create Initial Subscription
|--------------------------------------------------------------------------
*/
async function createInitialSubscription(organizationId, plan = client_1.OrganizerPlan.STARTER, country = DEFAULT_BILLING_COUNTRY, interval = DEFAULT_BILLING_INTERVAL) {
    const config = billing_plans_1.ORGANIZER_PLANS[plan];
    if (!config) {
        throw new Error("Invalid organizer plan.");
    }
    const pricing = getPlanPricing(country, plan, interval);
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
        },
        update: {
            plan,
            status: client_1.SubscriptionStatus.PENDING,
            currency: pricing.currency,
            amount: pricing.amount,
            interval,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
        },
    });
}
/*
|--------------------------------------------------------------------------
| Create Organizer Checkout
|--------------------------------------------------------------------------
|
| Pricing is resolved by:
|
| country + plan + interval
|
| The Revolut variation is resolved from the selected price.
|
*/
async function createSubscriptionCheckout(data) {
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
    | Resolve Revolut Variation
    |--------------------------------------------------------------------------
    */
    const revolutPlanVariationId = pricing.revolutPlanVariationId;
    if (!revolutPlanVariationId ||
        typeof revolutPlanVariationId !==
            "string") {
        throw new Error(`Revolut plan variation is not configured for ${data.country} / ${data.plan} / ${data.interval}.`);
    }
    /*
    |--------------------------------------------------------------------------
    | Existing Subscription
    |--------------------------------------------------------------------------
    */
    const existing = await getOrganizationSubscription(data.organizationId);
    /*
    |--------------------------------------------------------------------------
    | Active Paid Subscription
    |--------------------------------------------------------------------------
    |
    | A TRIALING subscription is intentionally allowed to proceed.
    |
    | The organization receives a free trial first and can then convert
    | that trial into a paid Revolut subscription.
    |
    | Only an already ACTIVE paid subscription should block creation
    | of another paid checkout.
    |
    */
    if (existing &&
        existing.status ===
            client_1.SubscriptionStatus.ACTIVE) {
        throw new Error("Organization already has an active paid subscription.");
    }
    /*
    |--------------------------------------------------------------------------
    | Create / Update Pending Local Subscription
    |--------------------------------------------------------------------------
    */
    const subscription = await createInitialSubscription(data.organizationId, data.plan, data.country, data.interval);
    /*
    |--------------------------------------------------------------------------
    | Create Revolut Customer
    |--------------------------------------------------------------------------
    */
    const customer = await (0, revolut_service_1.createRevolutCustomer)({
        fullName: data.fullName,
        email: data.email,
    });
    /*
    |--------------------------------------------------------------------------
    | External Reference
    |--------------------------------------------------------------------------
    */
    const externalReference = `org_${data.organizationId}_${Date.now()}`;
    /*
    |--------------------------------------------------------------------------
    | Create Revolut Subscription
    |--------------------------------------------------------------------------
    */
    const revolutSubscription = await (0, revolut_service_1.createRevolutSubscription)({
        customerId: customer.id,
        planVariationId: revolutPlanVariationId,
        externalReference,
        redirectUrl: data.redirectUrl,
        idempotencyKey: externalReference,
    });
    /*
    |--------------------------------------------------------------------------
    | Setup Order
    |--------------------------------------------------------------------------
    */
    const setupOrderId = revolutSubscription
        .setup_order_id;
    if (!setupOrderId) {
        throw new Error("Revolut did not return a subscription setup order.");
    }
    /*
    |--------------------------------------------------------------------------
    | Get Hosted Checkout URL
    |--------------------------------------------------------------------------
    */
    const order = await (0, revolut_service_1.getRevolutOrder)(setupOrderId);
    if (!order.checkout_url) {
        throw new Error("Revolut checkout URL was not returned.");
    }
    /*
    |--------------------------------------------------------------------------
    | Store Revolut References
    |--------------------------------------------------------------------------
    */
    const updated = await prisma_1.prisma.organizationSubscription.update({
        where: {
            id: subscription.id,
        },
        data: {
            status: client_1.SubscriptionStatus.PENDING,
            provider: "REVOLUT",
            providerCustomerId: customer.id,
            providerSubscriptionId: revolutSubscription.id,
            providerPriceId: revolutPlanVariationId,
            providerSetupOrderId: setupOrderId,
        },
    });
    /*
    |--------------------------------------------------------------------------
    | Return Checkout
    |--------------------------------------------------------------------------
    */
    return {
        subscription: updated,
        checkoutUrl: order.checkout_url,
        revolutSubscriptionId: revolutSubscription.id,
        setupOrderId,
        pricing: {
            amount: pricing.amount,
            currency: pricing.currency,
            interval: data.interval,
            country: data.country,
            plan: data.plan,
        },
    };
}
