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
    subscription.status !==
      SubscriptionStatus.ACTIVE &&
    subscription.status !==
      SubscriptionStatus.TRIALING
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

  if (
    existing &&
    (
      existing.status ===
        SubscriptionStatus.ACTIVE ||
      existing.status ===
        SubscriptionStatus.TRIALING
    )
  ) {
    throw new Error(
      "Organization already has an active subscription.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Create / Update Local Subscription
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