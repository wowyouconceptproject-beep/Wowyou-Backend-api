import {
  Request,
  Response,
} from "express";

import Stripe from "stripe";

import { prisma } from "../../../lib/prisma";

import {
  constructStripeWebhookEvent,
  getStripeCheckoutSession,
} from "./stripe.service";

import {
  issuePurchase,
} from "../../purchases/ticket-issuance.service";

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
    |
    | Stripe signature verification requires the ORIGINAL request body.
    |
    */

    const rawBody =
      Buffer.isBuffer(
        req.body,
      )
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
        id:
          event.id,

        type:
          event.type,
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
      | Checkout Completed
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
      | Subscription Created
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
      | Subscription Updated
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
      | Subscription Deleted
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
      | Invoice Paid
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
      | Invoice Payment Failed
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
    session.metadata
      ?.type ===
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
  | Retrieve the session directly from Stripe so financial information
  | is verified against Stripe's current state.
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
        id:
          purchaseId,
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
  | Verify Purchase Metadata
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
  |
  | IMPORTANT:
  |
  | The Prisma field is `ticketTypeId`, NOT `ticketId`.
  |
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
      "STRIPE" &&
    purchase.paymentProvider !==
      "Stripe"
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
    purchase.event.currency
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
  | Stripe uses the smallest currency unit.
  |
  | Example:
  |
  | USD 10.00 = 1000
  |
  |--------------------------------------------------------------------------
  */

  const expectedAmount =
    Math.round(
      Number(
        purchase.amount,
      ) * 100,
    );

  const receivedAmount =
    verifiedSession.amount_total;

  if (
    receivedAmount ===
      null ||
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
  | Mark Paid + Update Inventory
  |--------------------------------------------------------------------------
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

          if (
            !lockedPurchase
          ) {
            throw new Error(
              "Purchase not found during Stripe transaction.",
            );
          }

          /*
          |--------------------------------------------------------------------------
          | Idempotency
          |--------------------------------------------------------------------------
          |
          | If another webhook already completed this purchase,
          | do nothing.
          |
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
              },
            });

          if (!ticketType) {
            throw new Error(
              "Ticket type not found for purchase.",
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
  |
  | This is important because another webhook could have processed
  | the same purchase while this request was running.
  |
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
  | Issue Ticket / Pass
  |--------------------------------------------------------------------------
  |
  | This runs whenever the final state is PAID.
  |
  | issuePurchase() should itself be idempotent so repeated webhook
  | deliveries cannot create duplicate passes.
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
  | IMPORTANT
  |--------------------------------------------------------------------------
  |
  | We do NOT mark the purchase as PAID.
  |
  */
}

/*
|--------------------------------------------------------------------------
| Payment Intent Failed
|--------------------------------------------------------------------------
*/

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
) {
  console.warn(
    "STRIPE PAYMENT INTENT FAILED:",
    {
      paymentIntentId:
        paymentIntent.id,

      purchaseId:
        paymentIntent.metadata
          ?.purchaseId,

      reason:
        paymentIntent.last_payment_error
          ?.message ?? null,
    },
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
  const subscriptionId =
    typeof session.subscription ===
    "string"
      ? session.subscription
      : session.subscription?.id;

  const organizationSubscriptionId =
    session.metadata
      ?.organizationSubscriptionId;

  console.log(
    "STRIPE ORGANIZER SUBSCRIPTION CHECKOUT:",
    {
      sessionId:
        session.id,

      subscriptionId:
        subscriptionId ?? null,

      organizationSubscriptionId:
        organizationSubscriptionId ?? null,

      paymentStatus:
        session.payment_status,
    },
  );

  /*
  |--------------------------------------------------------------------------
  | Subscription persistence
  |--------------------------------------------------------------------------
  |
  | OrganizationSubscription will be connected here when we implement
  | the organizer Stripe subscription flow.
  |
  */
}

/*
|--------------------------------------------------------------------------
| Subscription Event
|--------------------------------------------------------------------------
*/

async function handleSubscriptionEvent(
  event: Stripe.Event,
) {
  const subscription =
    event.data.object as Stripe.Subscription;

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

      customer:
        typeof subscription.customer ===
        "string"
          ? subscription.customer
          : subscription.customer?.id,
    },
  );

  /*
  |--------------------------------------------------------------------------
  | OrganizationSubscription persistence
  |--------------------------------------------------------------------------
  |
  | Implement with the organizer Stripe subscription service.
  |
  */
}

/*
|--------------------------------------------------------------------------
| Invoice Paid
|--------------------------------------------------------------------------
*/

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
) {
  console.log(
    "STRIPE INVOICE PAID:",
    {
      invoiceId:
        invoice.id,

      customer:
        typeof invoice.customer ===
        "string"
          ? invoice.customer
          : invoice.customer?.id,
    },
  );

  /*
  |--------------------------------------------------------------------------
  | Organizer subscription renewal
  |--------------------------------------------------------------------------
  |
  | OrganizationSubscription renewal logic will be connected here.
  |
  */
}

/*
|--------------------------------------------------------------------------
| Invoice Payment Failed
|--------------------------------------------------------------------------
*/

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
) {
  console.warn(
    "STRIPE INVOICE PAYMENT FAILED:",
    {
      invoiceId:
        invoice.id,

      customer:
        typeof invoice.customer ===
        "string"
          ? invoice.customer
          : invoice.customer?.id,
    },
  );

  /*
  |--------------------------------------------------------------------------
  | Organizer subscription failure
  |--------------------------------------------------------------------------
  |
  | OrganizationSubscription failure handling will be connected here.
  |
  */
}