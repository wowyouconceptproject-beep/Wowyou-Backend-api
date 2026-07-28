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
    | Ignore Non-Completion Events
    |--------------------------------------------------------------------------
    |
    | We acknowledge them so Revolut does not keep retrying them.
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
    | Retrieve Order Directly From Revolut
    |--------------------------------------------------------------------------
    |
    | Never trust the webhook payload alone for financial state.
    |
    */

    const order =
      await getRevolutOrder(
        orderId,
      );

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
    | Find Purchase
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
    | Complete Purchase
    |--------------------------------------------------------------------------
    */

    await prisma.ticketPurchase.update({
      where: {
        id:
          purchase.id,
      },

      data: {
        status:
          "PAID",
      },
    });

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