"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORGANIZER_TRIAL_DAYS = void 0;
exports.getOrganizationSubscription = getOrganizationSubscription;
exports.getPlans = getPlans;
exports.getPlan = getPlan;
exports.isSubscriptionActive = isSubscriptionActive;
exports.organizationHasFeature = organizationHasFeature;
exports.createOrganizationTrial = createOrganizationTrial;
exports.createInitialSubscription = createInitialSubscription;
exports.createSubscriptionCheckout = createSubscriptionCheckout;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const billing_plans_1 = require("./billing.plans");
const revolut_service_1 = require("../payments/revolut/revolut.service");
/*
|--------------------------------------------------------------------------
| Trial Configuration
|--------------------------------------------------------------------------
*/
exports.ORGANIZER_TRIAL_DAYS = 14;
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
| Subscription Active Check
|--------------------------------------------------------------------------
|
| ACTIVE subscriptions are always considered active.
|
| TRIALING subscriptions are active only until currentPeriodEnd.
|
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
|
| This is used when a new organization is created.
|
| It gives the organization 14 days of access to the selected plan
| without requiring immediate payment.
|
*/
async function createOrganizationTrial(organizationId, plan = client_1.OrganizerPlan.STARTER) {
    const config = billing_plans_1.ORGANIZER_PLANS[plan];
    if (!config) {
        throw new Error("Invalid organizer plan.");
    }
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
            currency: config.currency,
            amount: config.amount,
            interval: config.interval,
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
|
| IMPORTANT:
|
| This function is used by the payment checkout flow.
|
| It creates a PENDING subscription.
|
| It does NOT create or start the free trial.
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
    /*
    |--------------------------------------------------------------------------
    | Active Subscription
    |--------------------------------------------------------------------------
    |
    | An organization with an active paid subscription cannot start another
    | checkout over the existing subscription.
    |
    */
    if (existing &&
        (existing.status ===
            client_1.SubscriptionStatus.ACTIVE ||
            (existing.status ===
                client_1.SubscriptionStatus.TRIALING &&
                isSubscriptionActive(existing)))) {
        throw new Error("Organization already has an active subscription.");
    }
    /*
    |--------------------------------------------------------------------------
    | Create / Update Pending Local Subscription
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
