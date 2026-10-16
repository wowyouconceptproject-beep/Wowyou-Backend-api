"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConnectedAccount = createConnectedAccount;
exports.getConnectedAccount = getConnectedAccount;
exports.refreshConnectedAccountStatus = refreshConnectedAccountStatus;
exports.createOnboardingLink = createOnboardingLink;
exports.createLoginLink = createLoginLink;
exports.getOrganizationStripeStatus = getOrganizationStripeStatus;
const stripe_1 = __importDefault(require("stripe"));
const prisma_1 = require("../../lib/prisma");
let stripeClient = null;
function getStripe() {
    if (!stripeClient) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error("STRIPE_SECRET_KEY is not configured.");
        }
        stripeClient = new stripe_1.default(secretKey);
    }
    return stripeClient;
}
/*
|--------------------------------------------------------------------------
| Environment
|--------------------------------------------------------------------------
*/
function getConnectUrls() {
    const frontendUrl = process.env.FRONTEND_URL ||
        process.env.WEB_APP_URL ||
        process.env.NEXT_PUBLIC_WEB_URL;
    if (!frontendUrl) {
        throw new Error("FRONTEND_URL, WEB_APP_URL, or NEXT_PUBLIC_WEB_URL must be configured.");
    }
    const normalizedFrontendUrl = frontendUrl.replace(/\/+$/, "");
    return {
        refreshUrl: `${normalizedFrontendUrl}/dashboard/settings/payments/stripe/refresh`,
        returnUrl: `${normalizedFrontendUrl}/dashboard/settings/payments/stripe/return`,
    };
}
/*
|--------------------------------------------------------------------------
| Create Connected Account
|--------------------------------------------------------------------------
*/
async function createConnectedAccount(input) {
    const stripe = getStripe();
    const organization = await prisma_1.prisma.organization.findUnique({
        where: {
            id: input.organizationId,
        },
    });
    if (!organization) {
        throw new Error("Organization not found.");
    }
    /*
     * Reuse an existing connected account.
     */
    if (organization.stripeAccountId) {
        const existingAccount = await stripe.accounts.retrieve(organization.stripeAccountId);
        return existingAccount;
    }
    const email = input.email.trim();
    if (!email) {
        throw new Error("A valid email address is required to create a Stripe Connect account.");
    }
    const accountParams = {
        type: "express",
        email,
        capabilities: {
            transfers: {
                requested: true,
            },
        },
        business_profile: {
            name: input.businessName?.trim() ||
                organization.name,
        },
    };
    /*
     * Country is optional.
     * When supplied, Stripe uses it as the connected account's country.
     */
    if (input.country?.trim()) {
        accountParams.country = input.country.trim().toUpperCase();
    }
    const account = await stripe.accounts.create(accountParams);
    /*
     * Persist the account ID and initial account status.
     */
    await prisma_1.prisma.organization.update({
        where: {
            id: organization.id,
        },
        data: {
            stripeAccountId: account.id,
            stripeAccountStatus: account.type ?? "express",
            stripeChargesEnabled: account.charges_enabled,
            stripePayoutsEnabled: account.payouts_enabled,
            stripeDetailsSubmitted: account.details_submitted,
            stripeOnboardingComplete: account.details_submitted &&
                account.payouts_enabled,
        },
    });
    return account;
}
/*
|--------------------------------------------------------------------------
| Get Connected Account
|--------------------------------------------------------------------------
*/
async function getConnectedAccount(organizationId) {
    const stripe = getStripe();
    const organization = await prisma_1.prisma.organization.findUnique({
        where: {
            id: organizationId,
        },
        select: {
            id: true,
            stripeAccountId: true,
        },
    });
    if (!organization) {
        throw new Error("Organization not found.");
    }
    if (!organization.stripeAccountId) {
        return null;
    }
    return stripe.accounts.retrieve(organization.stripeAccountId);
}
/*
|--------------------------------------------------------------------------
| Refresh Stripe Account Status
|--------------------------------------------------------------------------
*/
async function refreshConnectedAccountStatus(organizationId) {
    const stripe = getStripe();
    const organization = await prisma_1.prisma.organization.findUnique({
        where: {
            id: organizationId,
        },
        select: {
            id: true,
            stripeAccountId: true,
        },
    });
    if (!organization) {
        throw new Error("Organization not found.");
    }
    if (!organization.stripeAccountId) {
        return {
            stripeAccountId: null,
            accountStatus: null,
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
            onboardingComplete: false,
            currentlyDue: [],
            eventuallyDue: [],
            disabledReason: null,
        };
    }
    const account = await stripe.accounts.retrieve(organization.stripeAccountId);
    const currentlyDue = account.requirements?.currently_due ?? [];
    const eventuallyDue = account.requirements?.eventually_due ?? [];
    const disabledReason = account.requirements?.disabled_reason ?? null;
    const onboardingComplete = account.details_submitted === true &&
        account.payouts_enabled === true;
    const accountStatus = disabledReason ??
        (onboardingComplete ? "active" : "pending");
    await prisma_1.prisma.organization.update({
        where: {
            id: organization.id,
        },
        data: {
            stripeAccountStatus: accountStatus,
            stripeChargesEnabled: account.charges_enabled,
            stripePayoutsEnabled: account.payouts_enabled,
            stripeDetailsSubmitted: account.details_submitted,
            stripeOnboardingComplete: onboardingComplete,
        },
    });
    return {
        stripeAccountId: account.id,
        accountStatus,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        onboardingComplete,
        currentlyDue,
        eventuallyDue,
        disabledReason,
    };
}
/*
|--------------------------------------------------------------------------
| Create Onboarding Link
|--------------------------------------------------------------------------
|
| If the organization already has a Stripe account, reuse it.
| If it does not, create and persist one before generating the link.
|
|--------------------------------------------------------------------------
*/
async function createOnboardingLink(organizationId, input = {}) {
    const stripe = getStripe();
    const organization = await prisma_1.prisma.organization.findUnique({
        where: {
            id: organizationId,
        },
        select: {
            id: true,
            name: true,
            stripeAccountId: true,
        },
    });
    if (!organization) {
        throw new Error("Organization not found.");
    }
    let accountId = organization.stripeAccountId;
    if (!accountId) {
        const email = input.email?.trim();
        if (!email) {
            throw new Error("A valid email address is required to create the Stripe Connect account.");
        }
        const account = await createConnectedAccount({
            organizationId,
            email,
            businessName: input.businessName?.trim() ||
                organization.name,
            country: input.country,
        });
        accountId = account.id;
    }
    else {
        /*
         * Verify the saved account before creating an onboarding link.
         */
        await stripe.accounts.retrieve(accountId);
    }
    const { refreshUrl, returnUrl } = getConnectUrls();
    const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
    });
    return {
        accountId,
        url: accountLink.url,
        expiresAt: accountLink.expires_at,
    };
}
/*
|--------------------------------------------------------------------------
| Get Stripe Login Link
|--------------------------------------------------------------------------
|
| Express connected accounts can access their Stripe Express Dashboard
| through a login link.
|
|--------------------------------------------------------------------------
*/
async function createLoginLink(organizationId) {
    const stripe = getStripe();
    const organization = await prisma_1.prisma.organization.findUnique({
        where: {
            id: organizationId,
        },
        select: {
            id: true,
            stripeAccountId: true,
        },
    });
    if (!organization) {
        throw new Error("Organization not found.");
    }
    if (!organization.stripeAccountId) {
        throw new Error("Stripe Connect account has not been created.");
    }
    const loginLink = await stripe.accounts.createLoginLink(organization.stripeAccountId);
    return {
        url: loginLink.url,
    };
}
/*
|--------------------------------------------------------------------------
| Get Organization Stripe Status
|--------------------------------------------------------------------------
*/
async function getOrganizationStripeStatus(organizationId) {
    return refreshConnectedAccountStatus(organizationId);
}
