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
  createRevolutCustomer,
  createRevolutSubscription,
  getRevolutOrder,
} from "../payments/revolut/revolut.service";

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

const DEFAULT_BILLING_COUNTRY: BillingCountry =
  "GB";

const DEFAULT_BILLING_INTERVAL: BillingInterval =
  "MONTH";

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
  if (
    subscription.status ===
    SubscriptionStatus.ACTIVE
  ) {
    return true;
  }

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
  const config =
    ORGANIZER_PLANS[plan];

  if (!config) {
    throw new Error(
      "Invalid organizer plan.",
    );
  }

  const pricing =
    getPlanPricing(
      country,
      plan,
      interval,
    );

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

  const now =
    new Date();

  const trialEnd =
    new Date(now);

  trialEnd.setDate(
    trialEnd.getDate() +
      ORGANIZER_TRIAL_DAYS,
  );

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
    },
  });
}

/*
|--------------------------------------------------------------------------
| Create Initial Subscription
|--------------------------------------------------------------------------
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
  const config =
    ORGANIZER_PLANS[plan];

  if (!config) {
    throw new Error(
      "Invalid organizer plan.",
    );
  }

  const pricing =
    getPlanPricing(
      country,
      plan,
      interval,
    );

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

      currentPeriodStart:
        null,

      currentPeriodEnd:
        null,

      cancelAtPeriodEnd:
        false,
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
  | Resolve Revolut Variation
  |--------------------------------------------------------------------------
  */

  const revolutPlanVariationId =
    pricing.revolutPlanVariationId;

  if (
    !revolutPlanVariationId ||
    typeof revolutPlanVariationId !==
      "string"
  ) {
    throw new Error(
      `Revolut plan variation is not configured for ${data.country} / ${data.plan} / ${data.interval}.`,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Existing Subscription
  |--------------------------------------------------------------------------
  */

  const existing =
    await getOrganizationSubscription(
      data.organizationId,
    );

  /*
  |--------------------------------------------------------------------------
  | Active Subscription
  |--------------------------------------------------------------------------
  */

  if (
    existing &&
    (
      existing.status ===
        SubscriptionStatus.ACTIVE ||
      (
        existing.status ===
          SubscriptionStatus.TRIALING &&
        isSubscriptionActive(
          existing,
        )
      )
    )
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
      data.organizationId,
      data.plan,
      data.country,
      data.interval,
    );

  /*
  |--------------------------------------------------------------------------
  | Create Revolut Customer
  |--------------------------------------------------------------------------
  */

  const customer =
    await createRevolutCustomer({
      fullName:
        data.fullName,

      email:
        data.email,
    });

  /*
  |--------------------------------------------------------------------------
  | External Reference
  |--------------------------------------------------------------------------
  */

  const externalReference =
    `org_${data.organizationId}_${Date.now()}`;

  /*
  |--------------------------------------------------------------------------
  | Create Revolut Subscription
  |--------------------------------------------------------------------------
  */

  const revolutSubscription =
    await createRevolutSubscription({
      customerId:
        customer.id,

      planVariationId:
        revolutPlanVariationId,

      externalReference,

      redirectUrl:
        data.redirectUrl,

      idempotencyKey:
        externalReference,
    });

  /*
  |--------------------------------------------------------------------------
  | Setup Order
  |--------------------------------------------------------------------------
  */

  const setupOrderId =
    revolutSubscription
      .setup_order_id;

  if (!setupOrderId) {
    throw new Error(
      "Revolut did not return a subscription setup order.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Get Hosted Checkout URL
  |--------------------------------------------------------------------------
  */

  const order =
    await getRevolutOrder(
      setupOrderId,
    );

  if (!order.checkout_url) {
    throw new Error(
      "Revolut checkout URL was not returned.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Store Revolut References
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
          "REVOLUT",

        providerCustomerId:
          customer.id,

        providerSubscriptionId:
          revolutSubscription.id,

        providerPriceId:
          revolutPlanVariationId,

        providerSetupOrderId:
          setupOrderId,
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
      order.checkout_url,

    revolutSubscriptionId:
      revolutSubscription.id,

    setupOrderId,

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
}