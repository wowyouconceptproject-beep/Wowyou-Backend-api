import {
  OrganizerPlan,
  SubscriptionStatus,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";

import {
  ORGANIZER_PLANS,
} from "./billing.plans";

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
| Subscription Active Check
|--------------------------------------------------------------------------
|
| ACTIVE subscriptions are always considered active.
|
| TRIALING subscriptions are active only until currentPeriodEnd.
|
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
|
| This is used when a new organization is created.
|
| It gives the organization 14 days of access to the selected plan
| without requiring immediate payment.
|
*/

export async function createOrganizationTrial(
  organizationId: string,
  plan: OrganizerPlan =
    OrganizerPlan.STARTER,
) {
  const config =
    ORGANIZER_PLANS[plan];

  if (!config) {
    throw new Error(
      "Invalid organizer plan.",
    );
  }

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
        config.currency,

      amount:
        config.amount,

      interval:
        config.interval,

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

export async function createInitialSubscription(
  organizationId: string,
  plan: OrganizerPlan =
    OrganizerPlan.STARTER,
) {
  const config =
    ORGANIZER_PLANS[plan];

  if (!config) {
    throw new Error(
      "Invalid organizer plan.",
    );
  }

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
        config.currency,

      amount:
        config.amount,

      interval:
        config.interval,
    },

    update: {
      plan,

      status:
        SubscriptionStatus.PENDING,

      currency:
        config.currency,

      amount:
        config.amount,

      interval:
        config.interval,

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
*/

export async function createSubscriptionCheckout(
  data: {
    organizationId: string;

    plan: OrganizerPlan;

    fullName: string;

    email: string;

    redirectUrl: string;
  },
) {
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
  | Revolut Plan Variation
  |--------------------------------------------------------------------------
  */

  if (
    !config.revolutPlanVariationId
  ) {
    throw new Error(
      `Revolut plan variation is not configured for ${data.plan}.`,
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
  |
  | An organization with an active paid subscription cannot start another
  | checkout over the existing subscription.
  |
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
        config.revolutPlanVariationId,

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
          config.revolutPlanVariationId,

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
  };
}