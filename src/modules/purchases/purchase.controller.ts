import {
  Response,
} from "express";

import {
  AuthRequest,
} from "../auth/auth.middleware";

import {
  createPurchase,
  getMyTickets,
  getMyEvents,
  getPurchasePaymentStatus,
  getMyEvent as getMyEventService,
  PurchaseCheckoutChannel,
} from "./purchase.service";

/*
|--------------------------------------------------------------------------
| Create Purchase
|--------------------------------------------------------------------------
*/

export async function create(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId =
      req.user?.userId;

    const ticketTypeId =
      String(
        req.body.ticketTypeId ?? "",
      ).trim();

    const quantity =
      Number(
        req.body.quantity,
      );

    /*
    |--------------------------------------------------------------------------
    | Checkout Channel
    |--------------------------------------------------------------------------
    |
    | MOBILE
    | Existing Flutter attendee application.
    |
    | WEB
    | Public event page / attendee web checkout.
    |
    | IMPORTANT:
    |
    | Mobile remains the default so existing app requests continue working
    | exactly as they do today.
    |
    */

    const channel =
      req.body.channel === "web"
        ? "web"
        : "mobile";

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Ticket Type
    |--------------------------------------------------------------------------
    */

    if (!ticketTypeId) {
      return res.status(400).json({
        success: false,

        message:
          "Ticket type is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Quantity
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(
        quantity,
      ) ||
      quantity < 1
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Quantity must be at least 1.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Purchase
    |--------------------------------------------------------------------------
    */

    const result =
      await createPurchase(
        userId,
        ticketTypeId,
        quantity,
        channel as PurchaseCheckoutChannel,
      );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    |
    | Paid ticket:
    |
    | paymentRequired = true
    | checkoutUrl      = Revolut checkout URL
    |
    | Free ticket:
    |
    | paymentRequired = false
    | checkoutUrl      = null
    |
    */

    return res.status(201).json({
      success: true,

      paymentRequired:
        result.paymentRequired,

      checkoutUrl:
        result.checkoutUrl ??
        null,

      purchase:
        result.purchase,
    });
  } catch (error: any) {
    console.error(
      "CREATE PURCHASE ERROR:",
      error,
    );

    return res.status(400).json({
      success: false,

      message:
        error?.message ??
        "Unable to create purchase.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Payment Status
|--------------------------------------------------------------------------
*/

export async function paymentStatus(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const purchaseId =
      Array.isArray(
        req.params.purchaseId,
      )
        ? req.params.purchaseId[0]
        : req.params.purchaseId;

    if (!purchaseId) {
      return res.status(400).json({
        success: false,
        message:
          "Purchase ID is required.",
      });
    }

    const purchase =
      await getPurchasePaymentStatus(
        userId,
        purchaseId,
      );

    return res.status(200).json({
      success: true,
      purchase,
    });
  } catch (error: any) {
    console.error(
      "PAYMENT STATUS ERROR:",
      error,
    );

    if (
      error?.message ===
      "Purchase not found."
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Purchase not found.",
      });
    }

    return res.status(400).json({
      success: false,
      message:
        error?.message ??
        "Unable to load payment status.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| My Tickets
|--------------------------------------------------------------------------
*/

export async function myTickets(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId =
      req.user?.userId;

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Paid Tickets
    |--------------------------------------------------------------------------
    */

    const tickets =
      await getMyTickets(
        userId,
      );

    return res.status(200).json({
      success: true,

      tickets,
    });
  } catch (error: any) {
    console.error(
      "MY TICKETS ERROR:",
      error,
    );

    return res.status(400).json({
      success: false,

      message:
        error?.message ??
        "Unable to load tickets.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| My Events
|--------------------------------------------------------------------------
*/

export async function myEvents(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId =
      req.user?.userId;

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Purchased Events
    |--------------------------------------------------------------------------
    */

    const events =
      await getMyEvents(
        userId,
      );

    return res.status(200).json({
      success: true,

      events,
    });
  } catch (error: any) {
    console.error(
      "MY EVENTS ERROR:",
      error,
    );

    return res.status(400).json({
      success: false,

      message:
        error?.message ??
        "Unable to load events.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Event Hub
|--------------------------------------------------------------------------
*/

export async function getMyEvent(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId =
      req.user?.userId;

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Purchase ID
    |--------------------------------------------------------------------------
    */

    const purchaseId =
      Array.isArray(
        req.params.purchaseId,
      )
        ? req.params.purchaseId[0]
        : req.params.purchaseId;

    if (!purchaseId) {
      return res.status(400).json({
        success: false,

        message:
          "Purchase ID is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Event Hub
    |--------------------------------------------------------------------------
    */

    const event =
      await getMyEventService(
        userId,
        purchaseId,
      );

    return res.status(200).json({
      success: true,

      event,
    });
  } catch (error: any) {
    console.error(
      "GET MY EVENT ERROR:",
      error,
    );

    /*
    |--------------------------------------------------------------------------
    | Not Found / Unauthorized Purchase
    |--------------------------------------------------------------------------
    */

    if (
      error?.message ===
      "Event not found."
    ) {
      return res.status(404).json({
        success: false,

        message:
          "Event not found.",
      });
    }

    return res.status(400).json({
      success: false,

      message:
        error?.message ??
        "Unable to load event.",
    });
  }
}