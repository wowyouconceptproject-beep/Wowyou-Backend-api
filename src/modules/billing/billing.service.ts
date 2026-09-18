import {
  OrganizerPlan,
  SubscriptionStatus,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";

import {
  ORGANIZER_PLANS,
} from "./billing.plans";

import {
  BillingCountry,
  BillingInterval,
  ORGANIZER_PRICING,
} from "./billing.pricing";

import {
  createStripeOrganizerSubscriptionCheckout,
} from "../payments/stripe/stripe.service";

/*
|--------------------------------------------------------------------------
| Trial Configuration
|--------------------------------------------------------------------------
*/

export const ORGANIZER_TRIAL_DAYS = 14;

/*
|--------------------------------------------------------------------------
| Default Billing Configuration
|--------------------------------------------------------------------------
*/

const DEFAULT_BILLING_COUNTRY: BillingCountry = "GB";

const DEFAULT_BILLING_INTERVAL: BillingInterval = "MONTH";

/*
|--------------------------------------------------------------------------
| Get Organization Subscription
|--------------------------------------------------------------------------
*/

export async function getOrganizationSubscription(
  organizationId: string,
) {
  return prisma.organizationSubscription.findUnique({
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

export function getPlans() {
  return Object.values(
    ORGANIZER_PLANS,
  );
}

/*
|--------------------------------------------------------------------------
| Get Plan
|--------------------------------------------------------------------------
*/

export function getPlan(
  plan: OrganizerPlan,
) {
  return ORGANIZER_PLANS[plan];
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

export function getPlanPricing(
  country: BillingCountry,
  plan: OrganizerPlan,
  interval: BillingInterval,
) {
  const countryPricing =
    ORGANIZER_PRICING[country];

  if (!countryPricing) {
    throw new Error(
      `Billing is not available for country ${country}.`,
    );
  }

  const planPricing =
    countryPricing[plan];

  if (!planPricing) {
    throw new Error(
      `Pricing is not configured for ${plan} in ${country}.`,
    );
  }

  const pricing =
    planPricing[interval];

  if (!pricing) {
    throw new Error(
      `Pricing is not configured for ${plan} in ${country} for ${interval} billing.`,
    );
  }

  return pricing;
}

/*
|--------------------------------------------------------------------------
| Subscription Active Check
|--------------------------------------------------------------------------
*/

export function isSubscriptionActive(
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
  },
) {
  /*
  |--------------------------------------------------------------------------
  | Paid Active Subscription
  |--------------------------------------------------------------------------
  */

  if (
    subscription.status ===
    SubscriptionStatus.ACTIVE
  ) {
    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | Active Trial
  |--------------------------------------------------------------------------
  */

  if (
    subscription.status ===
    SubscriptionStatus.TRIALING
  ) {
    if (
      !subscription.currentPeriodEnd
    ) {
      return false;
    }

    return (
      subscription.currentPeriodEnd >
      new Date()
    );
  }

  return false;
}

/*
|--------------------------------------------------------------------------
| Organization Feature Access
|--------------------------------------------------------------------------
*/

export async function organizationHasFeature(
  organizationId: string,
  feature: string,
) {
  const subscription =
    await getOrganizationSubscription(
      organizationId,
    );

  if (!subscription) {
    return false;
  }

  if (
    !isSubscriptionActive(
      subscription,
    )
  ) {
    return false;
  }

  const config =
    ORGANIZER_PLANS[
      subscription.plan
    ];

  if (!config) {
    return false;
  }

  return config.features.includes(
    feature,
  );
}

/*
|--------------------------------------------------------------------------
| Create Organization Trial
|--------------------------------------------------------------------------
*/

export async function createOrganizationTrial(
  organizationId: string,
  plan: OrganizerPlan =
    OrganizerPlan.STARTER,
  country: BillingCountry =
    DEFAULT_BILLING_COUNTRY,
  interval: BillingInterval =
    DEFAULT_BILLING_INTERVAL,
) {
  /*
  |--------------------------------------------------------------------------
  | Validate Plan
  |--------------------------------------------------------------------------
  */

  const config =
    ORGANIZER_PLANS[plan];

  if (!config) {
    throw new Error(
      "Invalid organizer plan.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Resolve Pricing
  |--------------------------------------------------------------------------
  */

  const pricing =
    getPlanPricing(
      country,
      plan,
      interval,
    );

  /*
  |--------------------------------------------------------------------------
  | Existing Subscription
  |--------------------------------------------------------------------------
  */

  const existing =
    await getOrganizationSubscription(
      organizationId,
    );

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

  const now =
    new Date();

  const trialEnd =
    new Date(now);

  trialEnd.setDate(
    trialEnd.getDate() +
      ORGANIZER_TRIAL_DAYS,
  );

  /*
  |--------------------------------------------------------------------------
  | Create Trial
  |--------------------------------------------------------------------------
  */

  return prisma.organizationSubscription.create({
    data: {
      organizationId,

      plan,

      status:
        SubscriptionStatus.TRIALING,

      currency:
        pricing.currency,

      amount:
        pricing.amount,

      interval,

      currentPeriodStart:
        now,

      currentPeriodEnd:
        trialEnd,

      cancelAtPeriodEnd:
        false,

      /*
      |--------------------------------------------------------------------------
      | No Stripe Subscription Yet
      |--------------------------------------------------------------------------
      */

      provider:
        null,

      providerCustomerId:
        null,

      providerSubscriptionId:
        null,

      providerPriceId:
        null,

      providerSetupOrderId:
        null,

      canceledAt:
        null,
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

export async function createInitialSubscription(
  organizationId: string,
  plan: OrganizerPlan =
    OrganizerPlan.STARTER,
  country: BillingCountry =
    DEFAULT_BILLING_COUNTRY,
  interval: BillingInterval =
    DEFAULT_BILLING_INTERVAL,
) {
  /*
  |--------------------------------------------------------------------------
  | Validate Plan
  |--------------------------------------------------------------------------
  */

  const config =
    ORGANIZER_PLANS[plan];

  if (!config) {
    throw new Error(
      "Invalid organizer plan.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Resolve Pricing
  |--------------------------------------------------------------------------
  */

  const pricing =
    getPlanPricing(
      country,
      plan,
      interval,
    );

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

  return prisma.organizationSubscription.upsert({
    where: {
      organizationId,
    },

    create: {
      organizationId,

      plan,

      status:
        SubscriptionStatus.PENDING,

      currency:
        pricing.currency,

      amount:
        pricing.amount,

      interval,

      provider:
        "STRIPE",

      providerCustomerId:
        null,

      providerSubscriptionId:
        null,

      providerPriceId:
        null,

      providerSetupOrderId:
        null,

      currentPeriodStart:
        null,

      currentPeriodEnd:
        null,

      cancelAtPeriodEnd:
        false,

      canceledAt:
        null,
    },

    update: {
      plan,

      status:
        SubscriptionStatus.PENDING,

      currency:
        pricing.currency,

      amount:
        pricing.amount,

      interval,

      provider:
        "STRIPE",

      providerCustomerId:
        null,

      providerSubscriptionId:
        null,

      providerPriceId:
        null,

      providerSetupOrderId:
        null,

      currentPeriodStart:
        null,

      currentPeriodEnd:
        null,

      cancelAtPeriodEnd:
        false,

      canceledAt:
        null,
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

export async function createSubscriptionCheckout(
  data: {
    organizationId: string;
    plan: OrganizerPlan;
    country: BillingCountry;
    interval: BillingInterval;
    fullName: string;
    email: string;
    redirectUrl: string;
  },
) {
  /*
  |--------------------------------------------------------------------------
  | Normalize Request Values
  |--------------------------------------------------------------------------
  */

  const organizationId =
    String(
      data.organizationId ?? "",
    ).trim();

  const fullName =
    String(
      data.fullName ?? "",
    ).trim();

  const email =
    String(
      data.email ?? "",
    )
      .trim()
      .toLowerCase();

  const redirectUrl =
    String(
      data.redirectUrl ?? "",
    ).trim();

  /*
  |--------------------------------------------------------------------------
  | Validate Organization
  |--------------------------------------------------------------------------
  */

  if (!organizationId) {
    throw new Error(
      "Organization ID is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Name
  |--------------------------------------------------------------------------
  */

  if (!fullName) {
    throw new Error(
      "Organizer full name is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Email
  |--------------------------------------------------------------------------
  */

  if (!email) {
    throw new Error(
      "Organizer email is required.",
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    throw new Error(
      "A valid organizer email is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Redirect URL
  |--------------------------------------------------------------------------
  */

  if (!redirectUrl) {
    throw new Error(
      "Billing redirect URL is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Plan
  |--------------------------------------------------------------------------
  */

  const config =
    ORGANIZER_PLANS[
      data.plan
    ];

  if (!config) {
    throw new Error(
      "Invalid organizer plan.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Resolve Pricing
  |--------------------------------------------------------------------------
  */

  const pricing =
    getPlanPricing(
      data.country,
      data.plan,
      data.interval,
    );

  /*
  |--------------------------------------------------------------------------
  | Existing Subscription
  |--------------------------------------------------------------------------
  */

  const existing =
    await getOrganizationSubscription(
      organizationId,
    );

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

  if (
    existing &&
    existing.status ===
      SubscriptionStatus.ACTIVE
  ) {
    throw new Error(
      "Organization already has an active subscription.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Create / Update Pending Local Subscription
  |--------------------------------------------------------------------------
  */

  const subscription =
    await createInitialSubscription(
      organizationId,
      data.plan,
      data.country,
      data.interval,
    );

  /*
  |--------------------------------------------------------------------------
  | Create Stripe Checkout
  |--------------------------------------------------------------------------
  */

  try {
    const checkout =
      await createStripeOrganizerSubscriptionCheckout({
        /*
        |--------------------------------------------------------------------------
        | WowYou Subscription
        |--------------------------------------------------------------------------
        */

        organizationSubscriptionId:
          subscription.id,

        organizationId,

        /*
        |--------------------------------------------------------------------------
        | Plan
        |--------------------------------------------------------------------------
        */

        plan:
          data.plan,

        /*
        |--------------------------------------------------------------------------
        | Billing Country
        |--------------------------------------------------------------------------
        */

        country:
          data.country,

        /*
        |--------------------------------------------------------------------------
        | Billing Interval
        |--------------------------------------------------------------------------
        */

        interval:
          data.interval,

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

        amount:
          pricing.amount,

        currency:
          pricing.currency,

        /*
        |--------------------------------------------------------------------------
        | Stripe Redirects
        |--------------------------------------------------------------------------
        */

        successUrl:
          redirectUrl,

        cancelUrl:
          redirectUrl,
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

    const updated =
      await prisma.organizationSubscription.update({
        where: {
          id:
            subscription.id,
        },

        data: {
          status:
            SubscriptionStatus.PENDING,

          provider:
            "STRIPE",

          providerPriceId:
            checkout.priceId,

          providerSetupOrderId:
            null,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | Return Checkout
    |--------------------------------------------------------------------------
    */

    return {
      subscription:
        updated,

      checkoutUrl:
        checkout.checkoutUrl,

      stripeSessionId:
        checkout.sessionId,

      stripePriceId:
        checkout.priceId,

      pricing: {
        amount:
          pricing.amount,

        currency:
          pricing.currency,

        interval:
          data.interval,

        country:
          data.country,

        plan:
          data.plan,
      },
    };
  } catch (error) {
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

    console.error(
      "STRIPE ORGANIZER SUBSCRIPTION CHECKOUT ERROR:",
      error,
    );

    throw error;
  }
}