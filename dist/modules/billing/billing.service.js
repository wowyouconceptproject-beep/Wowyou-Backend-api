"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrganizationSubscription = getOrganizationSubscription;
exports.getPlans = getPlans;
exports.getPlan = getPlan;
exports.organizationHasFeature = organizationHasFeature;
exports.createInitialSubscription = createInitialSubscription;
exports.createSubscriptionCheckout = createSubscriptionCheckout;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const billing_plans_1 = require("./billing.plans");
const revolut_service_1 = require("../payments/revolut/revolut.service");
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
| Organization Feature Access
|--------------------------------------------------------------------------
*/
async function organizationHasFeature(organizationId, feature) {
    const subscription = await getOrganizationSubscription(organizationId);
    if (!subscription) {
        return false;
    }
    if (subscription.status !==
        client_1.SubscriptionStatus.ACTIVE &&
        subscription.status !==
            client_1.SubscriptionStatus.TRIALING) {
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
| Create Initial Subscription
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This does NOT activate the organization.
|
| It creates a PENDING subscription that will be activated after the
| organizer successfully completes the Revolut checkout.
|
*/
async function createInitialSubscription(organizationId, plan = client_1.OrganizerPlan.STARTER) {
    const config = billing_plans_1.ORGANIZER_PLANS[plan];
    if (!config) {
        throw new Error("Invalid organizer plan.");
    }
    return prisma_1.prisma.organizationSubscription.upsert({
        where: {
            organizationId,
        },
        create: {
            organizationId,
            plan,
            status: client_1.SubscriptionStatus.PENDING,
            currency: config.currency,
            amount: config.amount,
            interval: config.interval,
        },
        update: {
            plan,
            status: client_1.SubscriptionStatus.PENDING,
            currency: config.currency,
            amount: config.amount,
            interval: config.interval,
        },
    });
}
/*
|--------------------------------------------------------------------------
| Create Organizer Checkout
|--------------------------------------------------------------------------
*/
async function createSubscriptionCheckout(data) {
    const config = billing_plans_1.ORGANIZER_PLANS[data.plan];
    if (!config) {
        throw new Error("Invalid organizer plan.");
    }
    /*
    |--------------------------------------------------------------------------
    | Revolut Plan Variation
    |--------------------------------------------------------------------------
    */
    if (!config.revolutPlanVariationId) {
        throw new Error(`Revolut plan variation is not configured for ${data.plan}.`);
    }
    /*
    |--------------------------------------------------------------------------
    | Existing Subscription
    |--------------------------------------------------------------------------
    */
    const existing = await getOrganizationSubscription(data.organizationId);
    if (existing &&
        (existing.status ===
            client_1.SubscriptionStatus.ACTIVE ||
            existing.status ===
                client_1.SubscriptionStatus.TRIALING)) {
        throw new Error("Organization already has an active subscription.");
    }
    /*
    |--------------------------------------------------------------------------
    | Create / Update Local Subscription
    |--------------------------------------------------------------------------
    */
    const subscription = await createInitialSubscription(data.organizationId, data.plan);
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
        planVariationId: config.revolutPlanVariationId,
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
            providerPriceId: config.revolutPlanVariationId,
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
    };
}
