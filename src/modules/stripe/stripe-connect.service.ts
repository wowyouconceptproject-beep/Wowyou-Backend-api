import Stripe from "stripe";
import { prisma } from "../../lib/prisma";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured.");
    }

    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

export interface CreateConnectedAccountInput {
  organizationId: string;
  email: string;
  businessName?: string;
  country?: string;
}

export interface StripeConnectStatus {
  stripeAccountId: string | null;
  accountStatus: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingComplete: boolean;
  currentlyDue: string[];
  eventuallyDue: string[];
  disabledReason: string | null;
}

/*
|--------------------------------------------------------------------------
| Environment
|--------------------------------------------------------------------------
*/

function getConnectUrls() {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    process.env.WEB_APP_URL ||
    process.env.NEXT_PUBLIC_WEB_URL;

  if (!frontendUrl) {
    throw new Error(
      "FRONTEND_URL, WEB_APP_URL, or NEXT_PUBLIC_WEB_URL must be configured.",
    );
  }

  return {
    refreshUrl: `${frontendUrl}/dashboard/settings/payments/stripe/refresh`,
    returnUrl: `${frontendUrl}/dashboard/settings/payments/stripe/return`,
  };
}

/*
|--------------------------------------------------------------------------
| Create Connected Account
|--------------------------------------------------------------------------
*/

export async function createConnectedAccount(
  input: CreateConnectedAccountInput,
) {
  const stripe = getStripe();

  const organization = await prisma.organization.findUnique({
    where: {
      id: input.organizationId,
    },
  });

  if (!organization) {
    throw new Error("Organization not found.");
  }

  /*
   * Do not create another Stripe account if one already exists.
   */
  if (organization.stripeAccountId) {
    const existingAccount = await stripe.accounts.retrieve(
      organization.stripeAccountId,
    );

    return existingAccount;
  }

  const accountParams: Stripe.AccountCreateParams = {
    type: "express",

    email: input.email,

    capabilities: {
      transfers: {
        requested: true,
      },
    },

    business_profile: {
      name:
        input.businessName?.trim() ||
        organization.name,
    },
  };

  /*
   * Country is optional.
   *
   * If supplied, Stripe uses it as the connected
   * account's country during account creation.
   */
  if (input.country?.trim()) {
    accountParams.country = input.country.trim().toUpperCase();
  }

  const account = await stripe.accounts.create(accountParams);

  await prisma.organization.update({
    where: {
      id: organization.id,
    },
    data: {
      stripeAccountId: account.id,
      stripeAccountStatus: account.type ?? "express",
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
      stripeDetailsSubmitted: account.details_submitted,
      stripeOnboardingComplete:
        account.details_submitted &&
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

export async function getConnectedAccount(
  organizationId: string,
) {
  const stripe = getStripe();

  const organization = await prisma.organization.findUnique({
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

  return stripe.accounts.retrieve(
    organization.stripeAccountId,
  );
}

/*
|--------------------------------------------------------------------------
| Refresh Stripe Account Status
|--------------------------------------------------------------------------
*/

export async function refreshConnectedAccountStatus(
  organizationId: string,
): Promise<StripeConnectStatus> {
  const stripe = getStripe();

  const organization = await prisma.organization.findUnique({
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

  const account = await stripe.accounts.retrieve(
    organization.stripeAccountId,
  );

  const currentlyDue =
    account.requirements?.currently_due ?? [];

  const eventuallyDue =
    account.requirements?.eventually_due ?? [];

  const disabledReason =
    account.requirements?.disabled_reason ?? null;

  const onboardingComplete =
    account.details_submitted === true &&
    account.payouts_enabled === true;

  await prisma.organization.update({
    where: {
      id: organization.id,
    },
    data: {
      stripeAccountStatus:
        account.requirements?.disabled_reason ??
        (onboardingComplete ? "active" : "pending"),

      stripeChargesEnabled:
        account.charges_enabled,

      stripePayoutsEnabled:
        account.payouts_enabled,

      stripeDetailsSubmitted:
        account.details_submitted,

      stripeOnboardingComplete:
        onboardingComplete,
    },
  });

  return {
    stripeAccountId: account.id,
    accountStatus:
      account.requirements?.disabled_reason ??
      (onboardingComplete ? "active" : "pending"),
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
*/

export async function createOnboardingLink(
  organizationId: string,
) {
  const stripe = getStripe();

  const organization = await prisma.organization.findUnique({
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
    throw new Error(
      "Stripe Connect account has not been created.",
    );
  }

  const { refreshUrl, returnUrl } =
    getConnectUrls();

  const accountLink =
    await stripe.accountLinks.create({
      account: organization.stripeAccountId,

      refresh_url: refreshUrl,

      return_url: returnUrl,

      type: "account_onboarding",
    });

  return {
    accountId: organization.stripeAccountId,
    url: accountLink.url,
    expiresAt: accountLink.expires_at,
  };
}

/*
|--------------------------------------------------------------------------
| Get Stripe Login Link
|--------------------------------------------------------------------------
|
| Express connected accounts can access their Stripe
| Express Dashboard through a login link.
|
|--------------------------------------------------------------------------
*/

export async function createLoginLink(
  organizationId: string,
) {
  const stripe = getStripe();

  const organization = await prisma.organization.findUnique({
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
    throw new Error(
      "Stripe Connect account has not been created.",
    );
  }

  const loginLink =
    await stripe.accounts.createLoginLink(
      organization.stripeAccountId,
    );

  return {
    url: loginLink.url,
  };
}

/*
|--------------------------------------------------------------------------
| Get Organization Stripe Status
|--------------------------------------------------------------------------
*/

export async function getOrganizationStripeStatus(
  organizationId: string,
) {
  return refreshConnectedAccountStatus(
    organizationId,
  );
}