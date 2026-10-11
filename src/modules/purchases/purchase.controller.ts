import {
  Response,
} from "express";

import {
  AuthRequest,
} from "../auth/auth.middleware";

import {
  createPurchase,
  getPurchaseQuote,
  getMyTickets,
  getMyEvents,
  getPurchasePaymentStatus,
  getMyEvent as getMyEventService,
  PurchaseCheckoutChannel,
} from "./purchase.service";

import {
  recordManualSale,
  ManualPaymentMethod,
} from "./manual-sale.service";

/*
|--------------------------------------------------------------------------
| Purchase Quote
|--------------------------------------------------------------------------
|
| Returns the authoritative checkout breakdown before payment.
|
| This endpoint must not:
| - Create a purchase.
| - Reserve ticket inventory.
| - Create a Stripe Checkout session.
|
| The purchase service validates the attendee, ticket, quantity,
| availability, and fee calculation.
|
*/

export async function quote(
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
        message: "Authentication required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Request Validation
    |--------------------------------------------------------------------------
    */

    const ticketTypeId =
      String(
        req.body.ticketTypeId ?? "",
      ).trim();

    const quantity =
      Number(
        req.body.quantity,
      );

    if (!ticketTypeId) {
      return res.status(400).json({
        success: false,
        message: "Ticket type is required.",
      });
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate Authoritative Quote
    |--------------------------------------------------------------------------
    |
    | All monetary values are calculated by the backend.
    | The client must never supply a trusted subtotal, fee, or total.
    |
    */

    const purchaseQuote =
      await getPurchaseQuote(
        userId,
        ticketTypeId,
        quantity,
      );

    return res.status(200).json({
      success: true,
      quote: purchaseQuote,
    });
  } catch (error: any) {
    console.error(
      "PURCHASE QUOTE ERROR:",
      error,
    );

    /*
    |--------------------------------------------------------------------------
    | Attendee Authorization
    |--------------------------------------------------------------------------
    */

    if (
      error?.code ===
      "ATTENDEE_REQUIRED"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only attendee accounts can purchase event tickets.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Error Response
    |--------------------------------------------------------------------------
    */

    const message =
      error?.message ??
      "Unable to calculate purchase quote.";

    const notFoundMessages = [
      "Attendee account not found.",
      "Ticket not found.",
    ];

    if (
      notFoundMessages.includes(message)
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return res.status(400).json({
      success: false,
      message,
    });
  }
}

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
    | MOBILE:
    | Existing Flutter attendee application.
    |
    | WEB:
    | Public event page / attendee web checkout.
    |
    | Mobile remains the default to preserve existing app requests.
    |
    */

    const channel: PurchaseCheckoutChannel =
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
        message: "Authentication required.",
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
        message: "Ticket type is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Quantity
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Purchase
    |--------------------------------------------------------------------------
    |
    | The purchase service remains responsible for attendee authorization,
    | ticket availability, authoritative fee calculation, purchase creation,
    | and Stripe Checkout initialization.
    |
    */

    const result =
      await createPurchase(
        userId,
        ticketTypeId,
        quantity,
        channel,
      );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,

      paymentRequired:
        result.paymentRequired,

      checkoutUrl:
        result.checkoutUrl ?? null,

      purchase:
        result.purchase,
    });
  } catch (error: any) {
    console.error(
      "CREATE PURCHASE ERROR:",
      error,
    );

    /*
    |--------------------------------------------------------------------------
    | Attendee Authorization
    |--------------------------------------------------------------------------
    */

    if (
      error?.code ===
      "ATTENDEE_REQUIRED"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only attendee accounts can purchase event tickets.",
      });
    }

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
|
| Payment status is read from our database.
| The Stripe webhook remains authoritative for payment confirmation.
|
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
        message: "Authentication required.",
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
        message: "Purchase ID is required.",
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
        message: "Purchase not found.",
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

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const tickets =
      await getMyTickets(userId);

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

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const events =
      await getMyEvents(userId);

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

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
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
        message: "Purchase ID is required.",
      });
    }

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

    if (
      error?.message ===
      "Event not found."
    ) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
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


export async function manualSale(
  req: AuthRequest,
  res: Response,
) {
  try {
    const organizerId = req.user?.userId;

    if (!organizerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const paymentMethod = String(
      req.body?.paymentMethod ?? "",
    ).trim().toUpperCase() as ManualPaymentMethod;

    const result = await recordManualSale(organizerId, {
      eventId: String(req.body?.eventId ?? "").trim(),
      ticketTypeId: String(req.body?.ticketTypeId ?? "").trim(),
      quantity: Number(req.body?.quantity),

      firstName: String(req.body?.firstName ?? ""),
      lastName: String(req.body?.lastName ?? ""),
      email: String(req.body?.email ?? ""),
      phone: String(req.body?.phone ?? ""),

      paymentMethod,
      paymentReference: String(
        req.body?.paymentReference ?? "",
      ),
    });

    return res.status(201).json({
      success: true,
      message: result.passesIssued
        ? "Offline sale recorded and tickets issued."
        : "Offline sale recorded, but pass issuance needs attention.",

      purchase: result.purchase,
      buyer: result.buyer,
      accountCreated: result.accountCreated,
      verificationEmailSent: result.verificationEmailSent,
      passesIssued: result.passesIssued,
      passCount: result.passCount,
    });
  } catch (error: any) {
    console.error("MANUAL SALE ERROR:", error);

    const message =
      error?.message ?? "Unable to record offline ticket sale.";

    const statusCode =
      message.includes("not authorized")
        ? 403
        : message.includes("not belong")
          ? 400
          : message.includes("not found")
            ? 404
            : 400;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
}
