import {
  Request,
  Response,
} from "express";

import {
  SubscriptionStatus,
} from "@prisma/client";

import Stripe, {
  Subscription,
} from "stripe";
type StripeSubscriptionStatus =
  Subscription["status"];

import { prisma } from "../../../lib/prisma";

import {
  constructStripeWebhookEvent,
  getStripe,
  getStripeCheckoutSession,
} from "./stripe.service";

import {
  issuePurchase,
} from "../../purchases/ticket-issuance.service";

/*
|--------------------------------------------------------------------------
| Stripe Subscription Compatibility Type
|--------------------------------------------------------------------------
|
| The installed Stripe SDK exposes Subscription, but some recurring
| subscription period properties are not available on the inferred type.
|
| These properties are returned by Stripe and are required by WowYou
| to mirror the billing period and cancellation state locally.
|
|--------------------------------------------------------------------------
*/

type StripeOrganizerSubscription =
  Subscription & {
    current_period_start?:
      number | null;

    current_period_end?:
      number | null;

    canceled_at?:
      number | null;

    cancel_at_period_end?:
      boolean;
  };

/*
|--------------------------------------------------------------------------
| Stripe Webhook
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This endpoint receives the ORIGINAL raw Stripe request body.
|
| app.ts MUST register this route with express.raw()
| BEFORE express.json().
|
|--------------------------------------------------------------------------
*/

export async function webhook(
  req: Request,
  res: Response,
) {
  try {
    /*
    |--------------------------------------------------------------------------
    | Stripe Signature
    |--------------------------------------------------------------------------
    */

    const signature =
      req.header(
        "stripe-signature",
      );

    if (!signature) {
      return res.status(400).json({
        success: false,
        message:
          "Missing Stripe signature.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Raw Request Body
    |--------------------------------------------------------------------------
    */

    const rawBody =
      Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(
            typeof req.body ===
              "string"
              ? req.body
              : "",
          );

    if (!rawBody.length) {
      return res.status(400).json({
        success: false,
        message:
          "Webhook body is unavailable.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Stripe Signature
    |--------------------------------------------------------------------------
    */

    const event =
      constructStripeWebhookEvent(
        rawBody,
        signature,
      );

    console.log(
      "STRIPE WEBHOOK:",
      {
        id: event.id,
        type: event.type,
      },
    );

    /*
    |--------------------------------------------------------------------------
    | Event Router
    |--------------------------------------------------------------------------
    */

    switch (event.type) {
      /*
      |--------------------------------------------------------------------------
      | Attendee Checkout Completed
      |--------------------------------------------------------------------------
      */

      case "checkout.session.completed": {
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );

        break;
      }

      /*
      |--------------------------------------------------------------------------
      | Async Checkout Payment Succeeded
      |--------------------------------------------------------------------------
      */

      case "checkout.session.async_payment_succeeded": {
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );

        break;
      }

      /*
      |--------------------------------------------------------------------------
      | Async Checkout Payment Failed
      |--------------------------------------------------------------------------
      */

      case "checkout.session.async_payment_failed": {
        await handleCheckoutPaymentFailed(
          event.data.object as Stripe.Checkout.Session,
        );

        break;
      }

      /*
      |--------------------------------------------------------------------------
      | Payment Intent Failed
      |--------------------------------------------------------------------------
      */

      case "payment_intent.payment_failed": {
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
        );

        break;
      }

      /*
      |--------------------------------------------------------------------------
      | Organizer Subscription Created
      |--------------------------------------------------------------------------
      */

      case "customer.subscription.created": {
        await handleSubscriptionEvent(
          event,
        );

        break;
      }

      /*
      |--------------------------------------------------------------------------
      | Organizer Subscription Updated
      |--------------------------------------------------------------------------
      */

      case "customer.subscription.updated": {
        await handleSubscriptionEvent(
          event,
        );

        break;
      }

      /*
      |--------------------------------------------------------------------------
      | Organizer Subscription Deleted
      |--------------------------------------------------------------------------
      */

      case "customer.subscription.deleted": {
        await handleSubscriptionEvent(
          event,
        );

        break;
      }

      /*
      |--------------------------------------------------------------------------
      | Organizer Invoice Paid
      |--------------------------------------------------------------------------
      */

      case "invoice.paid": {
        await handleInvoicePaid(
          event.data.object as Stripe.Invoice,
        );

        break;
      }

      /*
      |--------------------------------------------------------------------------
      | Organizer Invoice Payment Failed
      |--------------------------------------------------------------------------
      */

      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );

        break;
      }

      /*
      |--------------------------------------------------------------------------
      | Other Events
      |--------------------------------------------------------------------------
      */

      default: {
        console.log(
          "STRIPE EVENT IGNORED:",
          event.type,
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Acknowledge Webhook
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(
      "STRIPE WEBHOOK ERROR:",
      error,
    );

    /*
    |--------------------------------------------------------------------------
    | Return 400
    |--------------------------------------------------------------------------
    |
    | Stripe can retry the webhook when processing fails.
    |
    */

    return res.status(400).json({
      success: false,
      message:
        "Unable to process Stripe webhook.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Handle Checkout Completed
|--------------------------------------------------------------------------
*/

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
) {
  /*
  |--------------------------------------------------------------------------
  | Organizer Subscription Checkout
  |--------------------------------------------------------------------------
  */

  if (
    session.mode ===
      "subscription" ||
    session.metadata?.type ===
      "organizer_subscription"
  ) {
    await handleSubscriptionCheckout(
      session,
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Ticket Purchase ID
  |--------------------------------------------------------------------------
  */

  const purchaseId =
    session.metadata
      ?.purchaseId;

  if (!purchaseId) {
    console.warn(
      "STRIPE CHECKOUT WITHOUT PURCHASE ID:",
      {
        sessionId:
          session.id,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Retrieve Checkout Session From Stripe
  |--------------------------------------------------------------------------
  |
  | Stripe remains the financial source of truth.
  |
  */

  const verifiedSession =
    await getStripeCheckoutSession(
      session.id,
    );

  /*
  |--------------------------------------------------------------------------
  | Verify Payment Status
  |--------------------------------------------------------------------------
  */

  if (
    verifiedSession.payment_status !==
    "paid"
  ) {
    console.warn(
      "STRIPE CHECKOUT NOT PAID:",
      {
        sessionId:
          session.id,

        purchaseId,

        paymentStatus:
          verifiedSession.payment_status,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Find WowYou Purchase
  |--------------------------------------------------------------------------
  */

  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id: purchaseId,
      },

      include: {
        event: true,
        ticket: true,
      },
    });

  if (!purchase) {
    console.error(
      "STRIPE PURCHASE NOT FOUND:",
      {
        purchaseId,
        sessionId:
          session.id,
      },
    );

    /*
    |--------------------------------------------------------------------------
    | Throw so Stripe retries the webhook.
    |--------------------------------------------------------------------------
    */

    throw new Error(
      `Ticket purchase ${purchaseId} was not found.`,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Metadata
  |--------------------------------------------------------------------------
  */

  const metadata =
    verifiedSession.metadata;

  /*
  |--------------------------------------------------------------------------
  | Purchase ID
  |--------------------------------------------------------------------------
  */

  if (
    metadata?.purchaseId !==
    purchase.id
  ) {
    console.error(
      "STRIPE PURCHASE METADATA MISMATCH:",
      {
        purchaseId:
          purchase.id,

        metadataPurchaseId:
          metadata?.purchaseId,

        sessionId:
          verifiedSession.id,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | User ID
  |--------------------------------------------------------------------------
  */

  if (
    metadata?.userId &&
    metadata.userId !==
      purchase.userId
  ) {
    console.error(
      "STRIPE USER METADATA MISMATCH:",
      {
        purchaseId:
          purchase.id,

        expected:
          purchase.userId,

        received:
          metadata.userId,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Event ID
  |--------------------------------------------------------------------------
  */

  if (
    metadata?.eventId &&
    metadata.eventId !==
      purchase.eventId
  ) {
    console.error(
      "STRIPE EVENT METADATA MISMATCH:",
      {
        purchaseId:
          purchase.id,

        expected:
          purchase.eventId,

        received:
          metadata.eventId,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Ticket Type ID
  |--------------------------------------------------------------------------
  */

  if (
    metadata?.ticketTypeId &&
    metadata.ticketTypeId !==
      purchase.ticketTypeId
  ) {
    console.error(
      "STRIPE TICKET TYPE METADATA MISMATCH:",
      {
        purchaseId:
          purchase.id,

        expected:
          purchase.ticketTypeId,

        received:
          metadata.ticketTypeId,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Payment Provider
  |--------------------------------------------------------------------------
  */

  if (
    purchase.paymentProvider !==
    "STRIPE"
  ) {
    console.error(
      "STRIPE PAYMENT PROVIDER MISMATCH:",
      {
        purchaseId:
          purchase.id,

        provider:
          purchase.paymentProvider,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Payment Reference
  |--------------------------------------------------------------------------
  |
  | The purchase service stores the Stripe Checkout Session ID here.
  |
  | A webhook can arrive before the purchase reference has been saved,
  | so a null reference is allowed.
  |
  */

  if (
    purchase.paymentReference &&
    purchase.paymentReference !==
      verifiedSession.id
  ) {
    console.error(
      "STRIPE PAYMENT REFERENCE MISMATCH:",
      {
        purchaseId:
          purchase.id,

        expected:
          purchase.paymentReference,

        received:
          verifiedSession.id,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Currency
  |--------------------------------------------------------------------------
  */

  const stripeCurrency =
    verifiedSession.currency
      ?.toUpperCase();

  const purchaseCurrency =
    purchase.currency
      .toUpperCase();

  if (
    !stripeCurrency ||
    stripeCurrency !==
      purchaseCurrency
  ) {
    console.error(
      "STRIPE CURRENCY MISMATCH:",
      {
        purchaseId:
          purchase.id,

        expected:
          purchaseCurrency,

        received:
          stripeCurrency,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Amount
  |--------------------------------------------------------------------------
  |
  | Stripe Checkout uses the smallest currency unit.
  |
  */

  const normalizedCurrency =
    purchaseCurrency;

  const zeroDecimalCurrencies =
    new Set([
      "BIF",
      "CLP",
      "DJF",
      "GNF",
      "ISK",
      "JPY",
      "KMF",
      "KRW",
      "PYG",
      "RWF",
      "UGX",
      "VND",
      "VUV",
      "XAF",
      "XOF",
      "XPF",
    ]);

  const expectedAmount =
    zeroDecimalCurrencies.has(
      normalizedCurrency,
    )
      ? Math.round(
          Number(
            purchase.amount,
          ),
        )
      : Math.round(
          Number(
            purchase.amount,
          ) * 100,
        );

  const receivedAmount =
    verifiedSession.amount_total;

  if (
    receivedAmount === null ||
    receivedAmount ===
      undefined ||
    receivedAmount !==
      expectedAmount
  ) {
    console.error(
      "STRIPE AMOUNT MISMATCH:",
      {
        purchaseId:
          purchase.id,

        expected:
          expectedAmount,

        received:
          receivedAmount,

        currency:
          normalizedCurrency,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Client Reference
  |--------------------------------------------------------------------------
  |
  | stripe.service.ts sets client_reference_id to purchaseId.
  |
  */

  if (
    verifiedSession.client_reference_id &&
    verifiedSession.client_reference_id !==
      purchase.id
  ) {
    console.error(
      "STRIPE CLIENT REFERENCE MISMATCH:",
      {
        purchaseId:
          purchase.id,

        expected:
          purchase.id,

        received:
          verifiedSession.client_reference_id,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Mark Purchase Paid + Update Inventory
  |--------------------------------------------------------------------------
  |
  | This transaction is the critical payment boundary.
  |
  */

  let processed =
    false;

  if (
    purchase.status ===
    "PENDING"
  ) {
    processed =
      await prisma.$transaction(
        async (tx) => {
          /*
          |--------------------------------------------------------------------------
          | Lock Purchase Row
          |--------------------------------------------------------------------------
          */

          await tx.$queryRaw`
            SELECT id
            FROM "TicketPurchase"
            WHERE id = ${purchase.id}
            FOR UPDATE
          `;

          /*
          |--------------------------------------------------------------------------
          | Re-fetch Locked Purchase
          |--------------------------------------------------------------------------
          */

          const lockedPurchase =
            await tx.ticketPurchase.findUnique({
              where: {
                id:
                  purchase.id,
              },

              select: {
                id: true,
                status: true,
                quantity: true,
                ticketTypeId: true,
              },
            });

          if (!lockedPurchase) {
            throw new Error(
              "Purchase not found during Stripe transaction.",
            );
          }

          /*
          |--------------------------------------------------------------------------
          | Idempotency
          |--------------------------------------------------------------------------
          */

          if (
            lockedPurchase.status !==
            "PENDING"
          ) {
            return false;
          }

          /*
          |--------------------------------------------------------------------------
          | Verify Ticket Type
          |--------------------------------------------------------------------------
          */

          const ticketType =
            await tx.ticketType.findUnique({
              where: {
                id:
                  lockedPurchase.ticketTypeId,
              },

              select: {
                id: true,
                quantity: true,
                sold: true,
                isActive: true,
              },
            });

          if (!ticketType) {
            throw new Error(
              "Ticket type not found for purchase.",
            );
          }

          /*
          |--------------------------------------------------------------------------
          | Verify Inventory
          |--------------------------------------------------------------------------
          */

          const remaining =
            ticketType.quantity -
            ticketType.sold;

          if (
            remaining <
            lockedPurchase.quantity
          ) {
            throw new Error(
              "Ticket inventory is no longer sufficient to complete this purchase.",
            );
          }

          /*
          |--------------------------------------------------------------------------
          | Mark Purchase PAID
          |--------------------------------------------------------------------------
          */

          const updated =
            await tx.ticketPurchase.updateMany({
              where: {
                id:
                  lockedPurchase.id,

                status:
                  "PENDING",
              },

              data: {
                status:
                  "PAID",

                paymentReference:
                  verifiedSession.id,

                paymentCompletedAt:
                  new Date(),

                gatewayStatus:
                  verifiedSession.payment_status,
              },
            });

          /*
          |--------------------------------------------------------------------------
          | Concurrent Processing Protection
          |--------------------------------------------------------------------------
          */

          if (
            updated.count !==
            1
          ) {
            return false;
          }

          /*
          |--------------------------------------------------------------------------
          | Update Ticket Inventory
          |--------------------------------------------------------------------------
          */

          await tx.ticketType.update({
            where: {
              id:
                lockedPurchase.ticketTypeId,
            },

            data: {
              sold: {
                increment:
                  lockedPurchase.quantity,
              },
            },
          });

          return true;
        },
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Re-fetch Final Purchase State
  |--------------------------------------------------------------------------
  */

  const finalPurchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id:
          purchase.id,
      },

      select: {
        id: true,
        status: true,
        quantity: true,
      },
    });

  if (!finalPurchase) {
    throw new Error(
      "Purchase disappeared after Stripe payment processing.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Issue Ticket / Passes
  |--------------------------------------------------------------------------
  |
  | issuePurchase() must remain idempotent.
  |
  */

  if (
    finalPurchase.status ===
    "PAID"
  ) {
    await issuePurchase(
      finalPurchase.id,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Logging
  |--------------------------------------------------------------------------
  */

  console.log(
    "STRIPE TICKET PAYMENT PROCESSED:",
    {
      purchaseId:
        finalPurchase.id,

      sessionId:
        verifiedSession.id,

      quantity:
        finalPurchase.quantity,

      processed,

      status:
        finalPurchase.status,
    },
  );
}

/*
|--------------------------------------------------------------------------
| Async Checkout Payment Failed
|--------------------------------------------------------------------------
*/

async function handleCheckoutPaymentFailed(
  session: Stripe.Checkout.Session,
) {
  const purchaseId =
    session.metadata
      ?.purchaseId;

  console.warn(
    "STRIPE CHECKOUT PAYMENT FAILED:",
    {
      purchaseId:
        purchaseId ?? null,

      sessionId:
        session.id,

      paymentStatus:
        session.payment_status,
    },
  );

  /*
  |--------------------------------------------------------------------------
  | Only fail pending Stripe purchases.
  |--------------------------------------------------------------------------
  */

  if (!purchaseId) {
    return;
  }

  await prisma.ticketPurchase.updateMany({
    where: {
      id:
        purchaseId,

      status:
        "PENDING",

      paymentProvider:
        "STRIPE",
    },

    data: {
      status:
        "FAILED",

      gatewayStatus:
        "PAYMENT_FAILED",

      paymentFailedAt:
        new Date(),
    },
  });
}

/*
|--------------------------------------------------------------------------
| Payment Intent Failed
|--------------------------------------------------------------------------
*/

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
) {
  const purchaseId =
    paymentIntent.metadata
      ?.purchaseId;

  console.warn(
    "STRIPE PAYMENT INTENT FAILED:",
    {
      paymentIntentId:
        paymentIntent.id,

      purchaseId:
        purchaseId ?? null,

      reason:
        paymentIntent
          .last_payment_error
          ?.message ?? null,
    },
  );

  if (!purchaseId) {
    return;
  }

  await prisma.ticketPurchase.updateMany({
    where: {
      id:
        purchaseId,

      status:
        "PENDING",

      paymentProvider:
        "STRIPE",
    },

    data: {
      status:
        "FAILED",

      gatewayStatus:
        "PAYMENT_FAILED",

      paymentFailedAt:
        new Date(),
    },
  });
}

/*
|--------------------------------------------------------------------------
| Map Stripe Subscription Status
|--------------------------------------------------------------------------
*/

function mapStripeSubscriptionStatus(
  status: StripeSubscriptionStatus,
): SubscriptionStatus {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;

    case "trialing":
      return SubscriptionStatus.TRIALING;

    case "past_due":
      return SubscriptionStatus.PAST_DUE;

    case "canceled":
      return SubscriptionStatus.CANCELED;

    case "unpaid":
      return SubscriptionStatus.PAST_DUE;

    case "incomplete_expired":
      return SubscriptionStatus.EXPIRED;

    case "incomplete":
      return SubscriptionStatus.PENDING;

    case "paused":
      return SubscriptionStatus.PENDING;

    default:
      return SubscriptionStatus.PENDING;
  }
}

/*
|--------------------------------------------------------------------------
| Sync Organizer Subscription
|--------------------------------------------------------------------------
|
| Stripe is the source of truth for:
|
| - subscription status
| - Stripe customer
| - Stripe subscription
| - Stripe recurring price
| - billing period
| - cancellation state
|
| WowYou mirrors that state locally in OrganizationSubscription.
|
|--------------------------------------------------------------------------
*/

async function syncStripeOrganizerSubscription(
  stripeSubscription:
    StripeOrganizerSubscription,

  organizationSubscriptionId?:
    string,
) {
  const metadata =
    stripeSubscription.metadata ??
    {};

  /*
  |--------------------------------------------------------------------------
  | Resolve Local Subscription
  |--------------------------------------------------------------------------
  */

  const localSubscriptionId =
    organizationSubscriptionId ||
    metadata.organizationSubscriptionId;

  if (!localSubscriptionId) {
    console.warn(
      "STRIPE SUBSCRIPTION WITHOUT WOWYOU SUBSCRIPTION ID:",
      {
        stripeSubscriptionId:
          stripeSubscription.id,
      },
    );

    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | Stripe Customer
  |--------------------------------------------------------------------------
  */

  const customerId =
    typeof stripeSubscription.customer ===
    "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer?.id;

  /*
  |--------------------------------------------------------------------------
  | Stripe Price
  |--------------------------------------------------------------------------
  */

  const firstItem =
    stripeSubscription.items
      .data[0];

  const priceId =
    firstItem?.price?.id ??
    null;

  /*
  |--------------------------------------------------------------------------
  | Status
  |--------------------------------------------------------------------------
  */

  const status =
    mapStripeSubscriptionStatus(
      stripeSubscription.status,
    );

  /*
  |--------------------------------------------------------------------------
  | Billing Period
  |--------------------------------------------------------------------------
  */

  const currentPeriodStart =
    stripeSubscription
      .current_period_start
      ? new Date(
          stripeSubscription
            .current_period_start *
            1000,
        )
      : null;

  const currentPeriodEnd =
    stripeSubscription
      .current_period_end
      ? new Date(
          stripeSubscription
            .current_period_end *
            1000,
        )
      : null;

  /*
  |--------------------------------------------------------------------------
  | Cancellation
  |--------------------------------------------------------------------------
  */

  const canceledAt =
    stripeSubscription.canceled_at
      ? new Date(
          stripeSubscription
            .canceled_at *
            1000,
        )
      : null;

  /*
  |--------------------------------------------------------------------------
  | Update Local Subscription
  |--------------------------------------------------------------------------
  */

  const updated =
    await prisma.organizationSubscription.update({
      where: {
        id:
          localSubscriptionId,
      },

      data: {
        provider:
          "STRIPE",

        providerCustomerId:
          customerId ?? null,

        providerSubscriptionId:
          stripeSubscription.id,

        providerPriceId:
          priceId,

        /*
        | Stripe is now the subscription provider.
        | Revolut setup-order data is no longer used.
        */

        providerSetupOrderId:
          null,

        status,

        currentPeriodStart,

        currentPeriodEnd,

        cancelAtPeriodEnd:
          Boolean(
            stripeSubscription
              .cancel_at_period_end,
          ),

        canceledAt,
      },
    });

  /*
  |--------------------------------------------------------------------------
  | Logging
  |--------------------------------------------------------------------------
  */

  console.log(
    "WOWYOU ORGANIZER SUBSCRIPTION SYNCED:",
    {
      organizationSubscriptionId:
        updated.id,

      stripeSubscriptionId:
        stripeSubscription.id,

      status:
        updated.status,

      providerCustomerId:
        updated.providerCustomerId,

      providerPriceId:
        updated.providerPriceId,

      currentPeriodStart:
        updated.currentPeriodStart,

      currentPeriodEnd:
        updated.currentPeriodEnd,

      cancelAtPeriodEnd:
        updated.cancelAtPeriodEnd,
    },
  );

  return updated;
}

/*
|--------------------------------------------------------------------------
| Get Stripe Subscription From Checkout
|--------------------------------------------------------------------------
*/

async function getStripeSubscriptionFromCheckout(
  session: Stripe.Checkout.Session,
) {
  const subscriptionId =
    typeof session.subscription ===
    "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    return null;
  }

  const stripe =
    getStripe();

  return stripe.subscriptions.retrieve(
    subscriptionId,
  );
}

/*
|--------------------------------------------------------------------------
| Organizer Subscription Checkout
|--------------------------------------------------------------------------
*/

async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
) {
  const organizationSubscriptionId =
    session.metadata
      ?.organizationSubscriptionId;

  /*
  |--------------------------------------------------------------------------
  | Retrieve Actual Subscription
  |--------------------------------------------------------------------------
  */

  const stripeSubscription =
    await getStripeSubscriptionFromCheckout(
      session,
    );

  console.log(
    "STRIPE ORGANIZER SUBSCRIPTION CHECKOUT:",
    {
      sessionId:
        session.id,

      stripeSubscriptionId:
        stripeSubscription?.id ??
        null,

      organizationSubscriptionId:
        organizationSubscriptionId ??
        null,

      paymentStatus:
        session.payment_status,
    },
  );

  /*
  |--------------------------------------------------------------------------
  | Stripe Subscription Missing
  |--------------------------------------------------------------------------
  */

  if (!stripeSubscription) {
    console.warn(
      "STRIPE ORGANIZER CHECKOUT WITHOUT SUBSCRIPTION:",
      {
        sessionId:
          session.id,

        organizationSubscriptionId:
          organizationSubscriptionId ??
          null,
      },
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Sync Subscription
  |--------------------------------------------------------------------------
  */

  await syncStripeOrganizerSubscription(
    stripeSubscription as StripeOrganizerSubscription,
    organizationSubscriptionId,
  );
}

/*
|--------------------------------------------------------------------------
| Subscription Event
|--------------------------------------------------------------------------
*/

async function handleSubscriptionEvent(
  event: Stripe.Event,
) {
  /*
  |--------------------------------------------------------------------------
  | Cast To Compatibility Type
  |--------------------------------------------------------------------------
  */

  const subscription =
    event.data.object as
      StripeOrganizerSubscription;

  const organizationSubscriptionId =
    subscription.metadata
      ?.organizationSubscriptionId;

  console.log(
    "STRIPE SUBSCRIPTION EVENT:",
    {
      eventId:
        event.id,

      type:
        event.type,

      subscriptionId:
        subscription.id,

      status:
        subscription.status,

      organizationSubscriptionId:
        organizationSubscriptionId ??
        null,

      customer:
        typeof subscription.customer ===
        "string"
          ? subscription.customer
          : subscription.customer?.id,
    },
  );

  /*
  |--------------------------------------------------------------------------
  | Sync Local Subscription
  |--------------------------------------------------------------------------
  */

  await syncStripeOrganizerSubscription(
    subscription,
    organizationSubscriptionId,
  );
}

/*
|--------------------------------------------------------------------------
| Get Subscription ID From Invoice
|--------------------------------------------------------------------------
*/

function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
): string | null {
  /*
  |--------------------------------------------------------------------------
  | Stripe SDK Compatibility
  |--------------------------------------------------------------------------
  */

  const rawInvoice =
    invoice as Stripe.Invoice & {
      subscription?:
        | string
        | Subscription
        | null;
    };

  if (
    typeof rawInvoice.subscription ===
    "string"
  ) {
    return rawInvoice.subscription;
  }

  if (
    rawInvoice.subscription &&
    typeof rawInvoice.subscription ===
      "object"
  ) {
    return (
      rawInvoice.subscription.id ??
      null
    );
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Invoice Paid
|--------------------------------------------------------------------------
*/

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
) {
  const subscriptionId =
    getInvoiceSubscriptionId(
      invoice,
    );

  console.log(
    "STRIPE INVOICE PAID:",
    {
      invoiceId:
        invoice.id,

      subscriptionId:
        subscriptionId ?? null,

      customer:
        typeof invoice.customer ===
        "string"
          ? invoice.customer
          : invoice.customer?.id,
    },
  );

  /*
  |--------------------------------------------------------------------------
  | Ticket payments are not subscriptions.
  |--------------------------------------------------------------------------
  |
  | An invoice without a subscription is not relevant to organizer
  | subscription billing.
  |
  */

  if (!subscriptionId) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Retrieve Current Stripe Subscription
  |--------------------------------------------------------------------------
  */

  const stripe =
    getStripe();

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId,
    );

  /*
  |--------------------------------------------------------------------------
  | Only sync the WowYou organizer subscription
  |--------------------------------------------------------------------------
  */

  await syncStripeOrganizerSubscription(
    subscription as StripeOrganizerSubscription,
    subscription.metadata
      ?.organizationSubscriptionId,
  );
}

/*
|--------------------------------------------------------------------------
| Invoice Payment Failed
|--------------------------------------------------------------------------
*/

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
) {
  const subscriptionId =
    getInvoiceSubscriptionId(
      invoice,
    );

  console.warn(
    "STRIPE INVOICE PAYMENT FAILED:",
    {
      invoiceId:
        invoice.id,

      subscriptionId:
        subscriptionId ?? null,

      customer:
        typeof invoice.customer ===
        "string"
          ? invoice.customer
          : invoice.customer?.id,
    },
  );

  if (!subscriptionId) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Retrieve Current Stripe Subscription
  |--------------------------------------------------------------------------
  |
  | Stripe remains authoritative.
  |
  */

  const stripe =
    getStripe();

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId,
    ) as StripeOrganizerSubscription;

  /*
  |--------------------------------------------------------------------------
  | Synchronize Stripe State
  |--------------------------------------------------------------------------
  */

  await syncStripeOrganizerSubscription(
    subscription,
    subscription.metadata
      ?.organizationSubscriptionId,
  );

  /*
  |--------------------------------------------------------------------------
  | Fallback For Older Subscriptions
  |--------------------------------------------------------------------------
  |
  | If an older Stripe subscription does not contain WowYou metadata,
  | locate it through the Stripe subscription ID already stored locally.
  |
  */

  if (
    !subscription.metadata
      ?.organizationSubscriptionId
  ) {
    await prisma.organizationSubscription.updateMany({
      where: {
        provider:
          "STRIPE",

        providerSubscriptionId:
          subscriptionId,
      },

      data: {
        status:
          SubscriptionStatus.PAST_DUE,
      },
    });
  }
}