import {
  Request,
  Response,
} from "express";

import { prisma } from "../../../lib/prisma";

import {
  getRevolutOrder,
  verifyRevolutWebhook,
} from "./revolut.service";

import {
  issuePurchase,
} from "../../purchases/ticket-issuance.service";

import {
  RevolutWebhookPayload,
} from "./revolut.types";

/*
|--------------------------------------------------------------------------
| Revolut Webhook
|--------------------------------------------------------------------------
*/

export async function webhook(
  req: Request,
  res: Response,
) {
  try {
    /*
    |--------------------------------------------------------------------------
    | Headers
    |--------------------------------------------------------------------------
    */

    const timestamp =
      req.header(
        "Revolut-Request-Timestamp",
      );

    const signature =
      req.header(
        "Revolut-Signature",
      );

    if (
      !timestamp ||
      !signature
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Missing Revolut signature.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Raw Body
    |--------------------------------------------------------------------------
    |
    | Express must preserve the original body for this route.
    |
    */

    const rawBody =
      Buffer.isBuffer(
        req.body,
      )
        ? req.body.toString(
            "utf8",
          )
        : "";

    if (!rawBody) {
      return res.status(400).json({
        success: false,
        message:
          "Webhook body is unavailable.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Signature Verification
    |--------------------------------------------------------------------------
    */

    const valid =
      verifyRevolutWebhook(
        rawBody,
        timestamp,
        signature,
      );

    if (!valid) {
      console.error(
        "INVALID REVOLUT WEBHOOK SIGNATURE",
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid webhook signature.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Parse Payload
    |--------------------------------------------------------------------------
    */

    let payload:
      RevolutWebhookPayload;

    try {
      payload =
        JSON.parse(
          rawBody,
        );
    } catch {
      return res.status(400).json({
        success: false,
        message:
          "Invalid webhook payload.",
      });
    }

    const {
      event,
      order_id: orderId,
    } = payload;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Order ID is missing.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Supported Payment Events
    |--------------------------------------------------------------------------
    |
    | ORDER_COMPLETED
    | ----------------
    | Used for successful ticket purchases and subscription payments.
    |
    | ORDER_PAYMENT_DECLINED
    | ----------------------
    | Used for failed organizer subscription payments.
    |
    | ORDER_PAYMENT_FAILED
    | --------------------
    | Used for failed organizer subscription payments.
    |
    */

    const supportedEvents = [
      "ORDER_COMPLETED",
      "ORDER_PAYMENT_DECLINED",
      "ORDER_PAYMENT_FAILED",
    ];

    if (
      !supportedEvents.includes(
        event,
      )
    ) {
      return res
        .status(204)
        .send();
    }

    /*
    |--------------------------------------------------------------------------
    | Retrieve Order Directly From Revolut
    |--------------------------------------------------------------------------
    |
    | Never trust financial state from the webhook payload alone.
    |
    */

    const order =
      await getRevolutOrder(
        orderId,
      );

    /*
    |--------------------------------------------------------------------------
    | Organizer Subscription Detection
    |--------------------------------------------------------------------------
    |
    | Subscription-related Revolut orders contain subscription_data.
    |
    | We check this BEFORE looking for a TicketPurchase because organizer
    | subscriptions do not belong to the ticket purchase system.
    |
    */

    const subscriptionData =
      (
        order as {
          subscription_data?: {
            subscription_id?: string;
          };
        }
      )
        .subscription_data;

    const revolutSubscriptionId =
      subscriptionData
        ?.subscription_id;

    if (
      revolutSubscriptionId
    ) {
      return handleSubscriptionPayment(
        res,
        event,
        orderId,
        revolutSubscriptionId,
        order,
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Initial Organizer Subscription Setup
    |--------------------------------------------------------------------------
    |
    | The initial hosted checkout can be associated with the setup order
    | stored on OrganizationSubscription.
    |
    */

    const pendingSubscription =
      await prisma.organizationSubscription.findFirst({
        where: {
          provider:
            "REVOLUT",

          providerSetupOrderId:
            orderId,
        },
      });

    if (
      pendingSubscription
    ) {
      return handleInitialSubscriptionPayment(
        res,
        event,
        orderId,
        pendingSubscription,
        order,
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Attendee Ticket Purchase
    |--------------------------------------------------------------------------
    |
    | Everything below handles the attendee ticket-payment flow.
    |
    */

    if (
      event !==
      "ORDER_COMPLETED"
    ) {
      return res
        .status(204)
        .send();
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Completed State
    |--------------------------------------------------------------------------
    */

    if (
      order.state !==
        "COMPLETED" &&
      order.state !==
        "completed"
    ) {
      console.warn(
        "REVOLUT ORDER NOT COMPLETED:",
        {
          orderId,
          state:
            order.state,
        },
      );

      return res
        .status(204)
        .send();
    }

    /*
    |--------------------------------------------------------------------------
    | Find Ticket Purchase
    |--------------------------------------------------------------------------
    */

    const purchase =
      await prisma.ticketPurchase.findFirst({
        where: {
          paymentReference:
            orderId,

          paymentProvider:
            "REVOLUT",
        },

        include: {
          event: true,

          ticket: true,
        },
      });

    if (!purchase) {
      console.error(
        "REVOLUT PURCHASE NOT FOUND:",
        orderId,
      );

      /*
      |--------------------------------------------------------------------------
      | Return success to prevent uncontrolled webhook retries.
      |--------------------------------------------------------------------------
      */

      return res
        .status(204)
        .send();
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Currency
    |--------------------------------------------------------------------------
    */

    if (
      order.currency
        .toUpperCase() !==
      purchase.event.currency
        .toUpperCase()
    ) {
      console.error(
        "REVOLUT CURRENCY MISMATCH:",
        {
          purchaseId:
            purchase.id,

          expected:
            purchase.event
              .currency,

          received:
            order.currency,
        },
      );

      return res
        .status(204)
        .send();
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Amount
    |--------------------------------------------------------------------------
    */

    const expectedAmount =
      Math.round(
        Number(
          purchase.amount,
        ) * 100,
      );

    if (
      order.amount !==
      expectedAmount
    ) {
      console.error(
        "REVOLUT AMOUNT MISMATCH:",
        {
          purchaseId:
            purchase.id,

          expected:
            expectedAmount,

          received:
            order.amount,
        },
      );

      return res
        .status(204)
        .send();
    }

    /*
    |--------------------------------------------------------------------------
    | Mark Purchase Paid + Update Inventory
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | TicketPurchase does not expose a ticketId scalar in the Prisma type.
    | The ticket is accessed through the existing `ticket` relation.
    |
    | The purchase status transition and inventory update happen inside
    | the SAME transaction.
    |
    | This means:
    |
    | PENDING → PAID
    |       +
    | TicketType.sold += quantity
    |
    | either both succeed or neither succeeds.
    |
    */

    if (
      purchase.status ===
      "PENDING"
    ) {
      const processed =
        await prisma.$transaction(
          async (tx) => {
            /*
            |--------------------------------------------------------------------------
            | Lock Purchase Row
            |--------------------------------------------------------------------------
            |
            | Prevent concurrent webhook requests from processing the same
            | purchase simultaneously.
            |
            */

            await tx.$queryRaw`
              SELECT id
              FROM "TicketPurchase"
              WHERE id = ${purchase.id}
              FOR UPDATE
            `;

            /*
            |--------------------------------------------------------------------------
            | Re-fetch Purchase State
            |--------------------------------------------------------------------------
            |
            | We use the ticket relation instead of ticketId because the
            | Prisma model exposes the relationship as `ticket`.
            |
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

                  ticket: {
                    select: {
                      id: true,
                    },
                  },
                },
              });

            if (
              !lockedPurchase
            ) {
              throw new Error(
                "Purchase not found during payment transaction.",
              );
            }

            /*
            |--------------------------------------------------------------------------
            | Idempotency
            |--------------------------------------------------------------------------
            |
            | Another webhook may have completed the transaction while this
            | request was waiting for the row lock.
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
            | Validate Ticket Relation
            |--------------------------------------------------------------------------
            */

            if (
              !lockedPurchase.ticket
            ) {
              throw new Error(
                "Ticket type not found for purchase.",
              );
            }

            /*
            |--------------------------------------------------------------------------
            | Mark Purchase As Paid
            |--------------------------------------------------------------------------
            */

            const updatedPurchase =
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
                    order.state,
                },
              });

            /*
            |--------------------------------------------------------------------------
            | Confirm Status Transition
            |--------------------------------------------------------------------------
            */

            if (
              updatedPurchase.count !==
              1
            ) {
              return false;
            }

            /*
            |--------------------------------------------------------------------------
            | Update Ticket Inventory
            |--------------------------------------------------------------------------
            |
            | The TicketType sold counter is updated only after the purchase
            | successfully transitions from PENDING to PAID.
            |
            */

            await tx.ticketType.update({
              where: {
                id:
                  lockedPurchase.ticket.id,
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

      if (processed) {
        console.log(
          "REVOLUT PURCHASE MARKED PAID + INVENTORY UPDATED:",
          {
            purchaseId:
              purchase.id,

            ticketTypeId:
              purchase.ticket.id,

            quantity:
              purchase.quantity,

            orderId,
          },
        );
      } else {
        console.log(
          "REVOLUT PURCHASE ALREADY PROCESSED:",
          {
            purchaseId:
              purchase.id,

            orderId,
          },
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Issue Ticket Passes
    |--------------------------------------------------------------------------
    |
    | We intentionally call issuePurchase() even when the purchase is already
    | PAID.
    |
    | This allows a later webhook retry to recover from a situation where
    | payment was successfully recorded but pass issuance failed.
    |
    | issuePurchase() has its own idempotency protection.
    |
    */

    await issuePurchase(
      purchase.id,
    );

    /*
    |--------------------------------------------------------------------------
    | Success
    |--------------------------------------------------------------------------
    */

    console.log(
      "REVOLUT PAYMENT COMPLETED:",
      {
        purchaseId:
          purchase.id,

        orderId,
      },
    );

    return res
      .status(204)
      .send();
  } catch (error) {
    console.error(
      "REVOLUT WEBHOOK ERROR:",
      error,
    );

    /*
    |--------------------------------------------------------------------------
    | Return 500
    |--------------------------------------------------------------------------
    |
    | This allows Revolut to retry a genuine processing failure.
    |
    */

    return res.status(500).json({
      success: false,
      message:
        "Unable to process webhook.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Initial Organizer Subscription Payment
|--------------------------------------------------------------------------
*/

async function handleInitialSubscriptionPayment(
  res: Response,
  event: string,
  orderId: string,
  subscription: any,
  order: any,
) {
  /*
  |--------------------------------------------------------------------------
  | Only Completed Payments Activate Subscription
  |--------------------------------------------------------------------------
  */

  if (
    event !==
    "ORDER_COMPLETED"
  ) {
    return res
      .status(204)
      .send();
  }

  if (
    order.state !==
      "COMPLETED" &&
    order.state !==
      "completed"
  ) {
    console.warn(
      "REVOLUT SUBSCRIPTION SETUP ORDER NOT COMPLETED:",
      {
        orderId,
        state:
          order.state,
      },
    );

    return res
      .status(204)
      .send();
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Currency
  |--------------------------------------------------------------------------
  */

  if (
    order.currency
      .toUpperCase() !==
    subscription.currency
      .toUpperCase()
  ) {
    console.error(
      "ORGANIZER SUBSCRIPTION CURRENCY MISMATCH:",
      {
        subscriptionId:
          subscription.id,

        expected:
          subscription.currency,

        received:
          order.currency,
      },
    );

    return res
      .status(204)
      .send();
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Amount
  |--------------------------------------------------------------------------
  */

  const expectedAmount =
    Math.round(
      Number(
        subscription.amount,
      ) * 100,
    );

  if (
    order.amount !==
    expectedAmount
  ) {
    console.error(
      "ORGANIZER SUBSCRIPTION AMOUNT MISMATCH:",
      {
        subscriptionId:
          subscription.id,

        expected:
          expectedAmount,

        received:
          order.amount,
      },
    );

    return res
      .status(204)
      .send();
  }

  /*
  |--------------------------------------------------------------------------
  | Activate Subscription
  |--------------------------------------------------------------------------
  */

  await prisma.organizationSubscription.update({
    where: {
      id:
        subscription.id,
    },

    data: {
      status:
        "ACTIVE",

      currentPeriodStart:
        new Date(),

      currentPeriodEnd:
        calculateNextMonth(),
    },
  });

  console.log(
    "ORGANIZER SUBSCRIPTION ACTIVATED:",
    {
      subscriptionId:
        subscription.id,

      orderId,
    },
  );

  return res
    .status(204)
    .send();
}

/*
|--------------------------------------------------------------------------
| Recurring Organizer Subscription Payment
|--------------------------------------------------------------------------
*/

async function handleSubscriptionPayment(
  res: Response,
  event: string,
  orderId: string,
  revolutSubscriptionId: string,
  order: any,
) {
  const subscription =
    await prisma.organizationSubscription.findUnique({
      where: {
        providerSubscriptionId:
          revolutSubscriptionId,
      },
    });

  if (!subscription) {
    console.error(
      "ORGANIZER SUBSCRIPTION NOT FOUND:",
      {
        revolutSubscriptionId,

        orderId,
      },
    );

    return res
      .status(204)
      .send();
  }

  /*
  |--------------------------------------------------------------------------
  | Failed Payment
  |--------------------------------------------------------------------------
  */

  if (
    event ===
      "ORDER_PAYMENT_DECLINED" ||
    event ===
      "ORDER_PAYMENT_FAILED"
  ) {
    await prisma.organizationSubscription.update({
      where: {
        id:
          subscription.id,
      },

      data: {
        status:
          "PAST_DUE",
      },
    });

    console.warn(
      "ORGANIZER SUBSCRIPTION PAYMENT FAILED:",
      {
        subscriptionId:
          subscription.id,

        orderId,
      },
    );

    return res
      .status(204)
      .send();
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Completed State
  |--------------------------------------------------------------------------
  */

  if (
    order.state !==
      "COMPLETED" &&
    order.state !==
      "completed"
  ) {
    return res
      .status(204)
      .send();
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Currency
  |--------------------------------------------------------------------------
  */

  if (
    order.currency
      .toUpperCase() !==
    subscription.currency
      .toUpperCase()
  ) {
    console.error(
      "RECURRING SUBSCRIPTION CURRENCY MISMATCH:",
      {
        subscriptionId:
          subscription.id,

        expected:
          subscription.currency,

        received:
          order.currency,
      },
    );

    return res
      .status(204)
      .send();
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Amount
  |--------------------------------------------------------------------------
  */

  const expectedAmount =
    Math.round(
      Number(
        subscription.amount,
      ) * 100,
    );

  if (
    order.amount !==
    expectedAmount
  ) {
    console.error(
      "RECURRING SUBSCRIPTION AMOUNT MISMATCH:",
      {
        subscriptionId:
          subscription.id,

        expected:
          expectedAmount,

        received:
          order.amount,
      },
    );

    return res
      .status(204)
      .send();
  }

  /*
  |--------------------------------------------------------------------------
  | Renew Subscription
  |--------------------------------------------------------------------------
  */

  await prisma.organizationSubscription.update({
    where: {
      id:
        subscription.id,
    },

    data: {
      status:
        "ACTIVE",

      currentPeriodStart:
        new Date(),

      currentPeriodEnd:
        calculateNextMonth(),

      cancelAtPeriodEnd:
        false,
    },
  });

  console.log(
    "ORGANIZER SUBSCRIPTION RENEWED:",
    {
      subscriptionId:
        subscription.id,

      orderId,
    },
  );

  return res
    .status(204)
    .send();
}

/*
|--------------------------------------------------------------------------
| Billing Period Helper
|--------------------------------------------------------------------------
*/

function calculateNextMonth() {
  const date =
    new Date();

  date.setMonth(
    date.getMonth() + 1,
  );

  return date;
}