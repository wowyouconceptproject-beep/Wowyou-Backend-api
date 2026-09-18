import Stripe from "stripe";

import {
  CreateStripeCheckoutSessionInput,
  StripeCheckoutResult,
} from "./stripe.types";

/*
|--------------------------------------------------------------------------
| Stripe Client
|--------------------------------------------------------------------------
*/

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey =
      process.env.STRIPE_SECRET_KEY?.trim();

    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is missing.",
      );
    }

    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

/*
|--------------------------------------------------------------------------
| Create Attendee Ticket Checkout
|--------------------------------------------------------------------------
|
| IMPORTANT MONEY FLOW
|
| Attendee
|    ↓
| Stripe Checkout
|    ↓
| WowYou Stripe Platform
|    ↓
| HOLD
|    ↓
| Event ends + 24 hours
|    ↓
| Settlement Engine
|    ↓
| Stripe Transfer
|    ↓
| Organizer Connected Account
|    ↓
| Stripe Payout
|    ↓
| Organizer Bank
|
| There is intentionally NO:
|
| - transfer_data.destination
| - application_fee_amount
| - connected account header
|
| The initial ticket charge belongs to WowYou.
|
|--------------------------------------------------------------------------
*/

export async function createStripeCheckoutSession(
  input: CreateStripeCheckoutSessionInput,
): Promise<StripeCheckoutResult> {
  /*
  |--------------------------------------------------------------------------
  | Validate Amount
  |--------------------------------------------------------------------------
  */

  if (
    !Number.isInteger(input.amount) ||
    input.amount < 1
  ) {
    throw new Error(
      "Invalid Stripe checkout amount.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Currency
  |--------------------------------------------------------------------------
  */

  const currency = String(
    input.currency ?? "",
  )
    .trim()
    .toLowerCase();

  if (!currency) {
    throw new Error(
      "Stripe checkout currency is required.",
    );
  }

  if (!/^[a-z]{3}$/.test(currency)) {
    throw new Error(
      "Stripe checkout currency must be a valid 3-letter currency code.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Purchase ID
  |--------------------------------------------------------------------------
  */

  const purchaseId = String(
    input.purchaseId ?? "",
  ).trim();

  if (!purchaseId) {
    throw new Error(
      "Purchase ID is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate User ID
  |--------------------------------------------------------------------------
  */

  const userId = String(
    input.userId ?? "",
  ).trim();

  if (!userId) {
    throw new Error(
      "User ID is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Event ID
  |--------------------------------------------------------------------------
  */

  const eventId = String(
    input.eventId ?? "",
  ).trim();

  if (!eventId) {
    throw new Error(
      "Event ID is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Ticket Type ID
  |--------------------------------------------------------------------------
  */

  const ticketTypeId = String(
    input.ticketTypeId ?? "",
  ).trim();

  if (!ticketTypeId) {
    throw new Error(
      "Ticket type ID is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Product Name
  |--------------------------------------------------------------------------
  */

  const productName = String(
    input.productName ?? "",
  ).trim();

  if (!productName) {
    throw new Error(
      "Stripe checkout product name is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Success URL
  |--------------------------------------------------------------------------
  */

  const successUrl = String(
    input.successUrl ?? "",
  ).trim();

  if (!successUrl) {
    throw new Error(
      "Stripe success URL is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Cancel URL
  |--------------------------------------------------------------------------
  */

  const cancelUrl = String(
    input.cancelUrl ?? "",
  ).trim();

  if (!cancelUrl) {
    throw new Error(
      "Stripe cancel URL is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Customer Email
  |--------------------------------------------------------------------------
  */

  const customerEmail =
    input.customerEmail
      ? String(
          input.customerEmail,
        ).trim()
      : null;

  /*
  |--------------------------------------------------------------------------
  | Stripe Client
  |--------------------------------------------------------------------------
  */

  const stripe = getStripe();

  /*
  |--------------------------------------------------------------------------
  | Stripe Metadata
  |--------------------------------------------------------------------------
  */

  const metadata: Stripe.MetadataParam = {
    purchaseId,
    userId,
    eventId,
    ticketTypeId,
  };

  /*
  |--------------------------------------------------------------------------
  | Create Checkout Session
  |--------------------------------------------------------------------------
  */

  const session =
    await stripe.checkout.sessions.create(
      {
        mode: "payment",

        client_reference_id:
          purchaseId,

        line_items: [
          {
            price_data: {
              currency,

              product_data: {
                name: productName,
              },

              unit_amount:
                input.amount,
            },

            quantity: 1,
          },
        ],

        ...(customerEmail
          ? {
              customer_email:
                customerEmail,
            }
          : {}),

        metadata,

        payment_intent_data: {
          metadata,
        },

        success_url:
          successUrl,

        cancel_url:
          cancelUrl,

        billing_address_collection:
          "auto",
      },
      {
        idempotencyKey:
          input.idempotencyKey?.trim() ||
          `purchase_${purchaseId}`,
      },
    );

  if (!session.url) {
    throw new Error(
      "Stripe did not return a checkout URL.",
    );
  }

  return {
    sessionId:
      session.id,

    checkoutUrl:
      session.url,

    paymentStatus:
      session.payment_status,
  };
}

/*
|--------------------------------------------------------------------------
| Retrieve Checkout Session
|--------------------------------------------------------------------------
*/

export async function getStripeCheckoutSession(
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  const normalizedSessionId =
    String(
      sessionId ?? "",
    ).trim();

  if (!normalizedSessionId) {
    throw new Error(
      "Stripe checkout session ID is required.",
    );
  }

  const stripe = getStripe();

  return stripe.checkout.sessions.retrieve(
    normalizedSessionId,
    {
      expand: [
        "payment_intent",
      ],
    },
  );
}

/*
|--------------------------------------------------------------------------
| Organizer Subscription Price
|--------------------------------------------------------------------------
|
| Stripe Prices are created/reused automatically from a deterministic
| lookup key.
|
|--------------------------------------------------------------------------
*/

function getOrganizerPriceLookupKey(input: {
  plan: string;
  country: string;
  interval: string;
  currency: string;
  amount: number;
}) {
  const amountMinor = Math.round(
    input.amount * 100,
  );

  return [
    "wowyou",
    "organizer",
    input.country.toUpperCase(),
    input.plan.toUpperCase(),
    input.interval.toUpperCase(),
    input.currency.toLowerCase(),
    amountMinor,
  ].join("_");
}

async function getOrCreateOrganizerPrice(
  input: {
    plan: string;
    country: string;
    interval: string;
    currency: string;
    amount: number;
  },
) {
  const stripe = getStripe();

  const currency =
    String(
      input.currency ?? "",
    )
      .trim()
      .toLowerCase();

  const amountMinor = Math.round(
    Number(input.amount) * 100,
  );

  if (
    !currency ||
    !/^[a-z]{3}$/.test(currency)
  ) {
    throw new Error(
      "Invalid organizer subscription currency.",
    );
  }

  if (
    !Number.isInteger(amountMinor) ||
    amountMinor < 1
  ) {
    throw new Error(
      "Invalid organizer subscription amount.",
    );
  }

  const lookupKey =
    getOrganizerPriceLookupKey({
      plan:
        input.plan,

      country:
        input.country,

      interval:
        input.interval,

      currency,

      amount:
        input.amount,
    });

  /*
  |--------------------------------------------------------------------------
  | Reuse Existing Stripe Price
  |--------------------------------------------------------------------------
  */

  const existing =
    await stripe.prices.list({
      lookup_keys: [
        lookupKey,
      ],

      active: true,

      type: "recurring",

      limit: 1,
    });

  if (
    existing.data.length > 0
  ) {
    return existing.data[0];
  }

  /*
  |--------------------------------------------------------------------------
  | Create Stripe Price
  |--------------------------------------------------------------------------
  */

  const recurringInterval =
    input.interval === "YEAR"
      ? "year"
      : "month";

  const planName =
    String(input.plan)
      .trim()
      .toLowerCase()
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase(),
      );

  const price =
    await stripe.prices.create(
      {
        currency,

        unit_amount:
          amountMinor,

        recurring: {
          interval:
            recurringInterval,
        },

        lookup_key:
          lookupKey,

        product_data: {
          name:
            `WOWYOU ${planName}`,

          metadata: {
            platform:
              "WOWYOU",

            type:
              "ORGANIZER_SUBSCRIPTION",

            plan:
              input.plan,

            country:
              input.country,

            interval:
              input.interval,
          },
        },

        metadata: {
          platform:
            "WOWYOU",

          type:
            "ORGANIZER_SUBSCRIPTION",

          plan:
            input.plan,

          country:
            input.country,

          interval:
            input.interval,
        },
      },
      {
        idempotencyKey:
          `organizer_price_${lookupKey}`,
      },
    );

  return price;
}

/*
|--------------------------------------------------------------------------
| Create Organizer Subscription Checkout
|--------------------------------------------------------------------------
*/

export async function createStripeOrganizerSubscriptionCheckout(
  input: {
    organizationSubscriptionId: string;
    organizationId: string;
    plan: string;
    country: string;
    interval: "MONTH" | "YEAR";
    fullName: string;
    email: string;
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  },
) {
  const stripe =
    getStripe();

  const organizationSubscriptionId =
    String(
      input.organizationSubscriptionId ?? "",
    ).trim();

  const organizationId =
    String(
      input.organizationId ?? "",
    ).trim();

  const email =
    String(
      input.email ?? "",
    )
      .trim()
      .toLowerCase();

  const fullName =
    String(
      input.fullName ?? "",
    ).trim();

  const plan =
    String(
      input.plan ?? "",
    )
      .trim()
      .toUpperCase();

  const country =
    String(
      input.country ?? "",
    )
      .trim()
      .toUpperCase();

  const interval =
    String(
      input.interval ?? "",
    )
      .trim()
      .toUpperCase() as
      | "MONTH"
      | "YEAR";

  const currency =
    String(
      input.currency ?? "",
    )
      .trim()
      .toLowerCase();

  const amount =
    Number(input.amount);

  const successUrl =
    String(
      input.successUrl ?? "",
    ).trim();

  const cancelUrl =
    String(
      input.cancelUrl ?? "",
    ).trim();

  if (!organizationSubscriptionId) {
    throw new Error(
      "Organization subscription ID is required.",
    );
  }

  if (!organizationId) {
    throw new Error(
      "Organization ID is required.",
    );
  }

  if (!email) {
    throw new Error(
      "Organizer email is required.",
    );
  }

  if (!fullName) {
    throw new Error(
      "Organizer full name is required.",
    );
  }

  if (!plan) {
    throw new Error(
      "Organizer subscription plan is required.",
    );
  }

  if (!country) {
    throw new Error(
      "Organizer billing country is required.",
    );
  }

  if (
    interval !== "MONTH" &&
    interval !== "YEAR"
  ) {
    throw new Error(
      "Organizer billing interval must be MONTH or YEAR.",
    );
  }

  if (
    !currency ||
    !/^[a-z]{3}$/.test(currency)
  ) {
    throw new Error(
      "Organizer subscription currency must be a valid 3-letter currency code.",
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Organizer subscription amount must be greater than zero.",
    );
  }

  if (!successUrl) {
    throw new Error(
      "Stripe subscription success URL is required.",
    );
  }

  if (!cancelUrl) {
    throw new Error(
      "Stripe subscription cancel URL is required.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Get / Create Recurring Price
  |--------------------------------------------------------------------------
  */

  const price =
    await getOrCreateOrganizerPrice({
      plan,

      country,

      interval,

      currency,

      amount,
    });

  /*
  |--------------------------------------------------------------------------
  | Metadata
  |--------------------------------------------------------------------------
  */

  const metadata:
    Stripe.MetadataParam = {
    type:
      "organizer_subscription",

    organizationSubscriptionId,

    organizationId,

    plan,

    country,

    interval,

    priceId:
      price.id,
  };

  /*
  |--------------------------------------------------------------------------
  | Success URL
  |--------------------------------------------------------------------------
  */

  const checkoutSuccessUrl =
    successUrl.includes("?")
      ? `${successUrl}&session_id={CHECKOUT_SESSION_ID}`
      : `${successUrl}?session_id={CHECKOUT_SESSION_ID}`;

  /*
  |--------------------------------------------------------------------------
  | Create Subscription Checkout
  |--------------------------------------------------------------------------
  */

  const session =
    await stripe.checkout.sessions.create(
      {
        mode:
          "subscription",

        line_items: [
          {
            price:
              price.id,

            quantity: 1,
          },
        ],

        customer_email:
          email,

        client_reference_id:
          organizationSubscriptionId,

        metadata,

        subscription_data: {
          metadata,
        },

        success_url:
          checkoutSuccessUrl,

        cancel_url:
          cancelUrl,

        billing_address_collection:
          "auto",
      },
      {
        idempotencyKey:
          `organizer_subscription_checkout_${organizationSubscriptionId}_${price.id}`,
      },
    );

  if (!session.url) {
    throw new Error(
      "Stripe did not return an organizer subscription checkout URL.",
    );
  }

  return {
    sessionId:
      session.id,

    checkoutUrl:
      session.url,

    priceId:
      price.id,
  };
}

/*
|--------------------------------------------------------------------------
| Retrieve PaymentIntent
|--------------------------------------------------------------------------
*/

export async function getStripePaymentIntent(
  paymentIntentId: string,
): Promise<Stripe.PaymentIntent> {
  const normalizedPaymentIntentId =
    String(
      paymentIntentId ?? "",
    ).trim();

  if (!normalizedPaymentIntentId) {
    throw new Error(
      "Stripe payment intent ID is required.",
    );
  }

  const stripe = getStripe();

  return stripe.paymentIntents.retrieve(
    normalizedPaymentIntentId,
  );
}

/*
|--------------------------------------------------------------------------
| Construct Stripe Webhook Event
|--------------------------------------------------------------------------
*/

export function constructStripeWebhookEvent(
  rawBody: Buffer | string,
  signature: string,
): Stripe.Event {
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is missing.",
    );
  }

  const normalizedSignature =
    String(
      signature ?? "",
    ).trim();

  if (!normalizedSignature) {
    throw new Error(
      "Stripe signature is missing.",
    );
  }

  if (!rawBody) {
    throw new Error(
      "Stripe webhook raw body is empty.",
    );
  }

  if (
    Buffer.isBuffer(rawBody)
  ) {
    if (
      rawBody.length ===
      0
    ) {
      throw new Error(
        "Stripe webhook raw body is empty.",
      );
    }
  } else if (
    rawBody.length === 0
  ) {
    throw new Error(
      "Stripe webhook raw body is empty.",
    );
  }

  const stripe =
    getStripe();

  return stripe.webhooks.constructEvent(
    rawBody,
    normalizedSignature,
    webhookSecret,
  );
}