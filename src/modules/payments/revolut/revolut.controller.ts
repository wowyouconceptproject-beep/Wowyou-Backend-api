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
    | IMPORTANT:
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
        req,
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
    | Everything below remains the existing ticket-payment flow.
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
    | Idempotency
    |--------------------------------------------------------------------------
    */

    if (
      purchase.status ===
      "PAID"
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
    | Complete Ticket Purchase
    |--------------------------------------------------------------------------
    */

    await issuePurchase(
      purchase.id,
    );

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
  req: Request,
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