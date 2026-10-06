import QRCode from "qrcode";

import { prisma } from "../../lib/prisma";

import {
  sendEmail,
} from "./email.service";

import {
  ticketPurchaseEmailTemplate,
} from "./email.templates";

/*
|--------------------------------------------------------------------------
| Send Attendee Ticket Email
|--------------------------------------------------------------------------
|
| This is the single source of truth for attendee ticket emails.
|
| IMPORTANT:
|
| The recipient ALWAYS comes from:
|
| TicketPurchase → User → email
|
| It NEVER comes from the Event → Organization owner.
|
| This service should only be called after the purchase is PAID and
| EventPass records have been issued.
|
|--------------------------------------------------------------------------
*/

export async function sendAttendeeTicketEmail(
  purchaseId: string,
) {
  /*
  |--------------------------------------------------------------------------
  | Load Purchase
  |--------------------------------------------------------------------------
  */

  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id:
          purchaseId,
      },

      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },

        event: {
          select: {
            id: true,
            title: true,
            venue: true,
            startDate: true,
            currency: true,
          },
        },

        ticket: {
          select: {
            id: true,
            name: true,
          },
        },

        passes: {
          where: {
            isActive: true,
            isRevoked: false,
          },

          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            passNumber: true,
            qrToken: true,
          },
        },
      },
    });

  /*
  |--------------------------------------------------------------------------
  | Validate Purchase
  |--------------------------------------------------------------------------
  */

  if (!purchase) {
    throw new Error(
      "Purchase not found.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Only PAID purchases receive attendee tickets
  |--------------------------------------------------------------------------
  */

  if (
    purchase.status !==
    "PAID"
  ) {
    throw new Error(
      "Attendee ticket email can only be sent for a paid purchase.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Attendee Email
  |--------------------------------------------------------------------------
  */

  const recipient =
    purchase.user?.email
      ?.trim()
      .toLowerCase();

  if (!recipient) {
    throw new Error(
      "Attendee email address not found.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Pass
  |--------------------------------------------------------------------------
  */

  if (
    !purchase.passes.length
  ) {
    throw new Error(
      "No active ticket pass found for this purchase.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Primary Pass
  |--------------------------------------------------------------------------
  |
  | The first pass is used for the email's QR attachment.
  |
  | Each issued EventPass still has its own validated passNumber/qrToken.
  |
  */

  const primaryPass =
    purchase.passes[0];

  if (
    !primaryPass.qrToken
  ) {
    throw new Error(
      "Ticket QR token not found.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Generate QR
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | QR content comes from the issued EventPass.
  | We do not generate a QR from the purchase ID or ticket type ID.
  |
  */

  const qrBuffer =
    await QRCode.toBuffer(
      primaryPass.qrToken,
      {
        type:
          "png",

        width:
          900,

        margin:
          2,

        errorCorrectionLevel:
          "H",
      },
    );

  /*
  |--------------------------------------------------------------------------
  | Email Template
  |--------------------------------------------------------------------------
  */

  const firstName =
    purchase.user.firstName?.trim() ||
    "Attendee";

  const template =
    ticketPurchaseEmailTemplate({
      firstName,

      eventTitle:
        purchase.event.title,

      ticketName:
        purchase.ticket.name,

      quantity:
        purchase.quantity,

      totalAmount:
        Number(
          purchase.amount,
        ),

      currency:
        purchase.currency ||
        purchase.event.currency,

      startDate:
        purchase.event.startDate,

      venue:
        purchase.event.venue,

      ticketId:
        primaryPass.passNumber,
    });

  /*
  |--------------------------------------------------------------------------
  | Send
  |--------------------------------------------------------------------------
  |
  | This is explicitly TICKET_PURCHASE.
  |
  | It is separate from ORGANIZER_TICKET_SALE.
  |
  */

  return sendEmail({
    type:
      "TICKET_PURCHASE",

    to:
      recipient,

    subject:
      template.subject,

    html:
      template.html,

    ...(template.text
      ? {
          text:
            template.text,
        }
      : {}),

    userId:
      purchase.user.id,

    purchaseId:
      purchase.id,

    eventId:
      purchase.event.id,

    attachments: [
      {
        filename:
          "wowyou-ticket-qr.png",

        content:
          qrBuffer,

        contentType:
          "image/png",

        contentId:
          "wowyou-ticket-qr",
      },
    ],

    idempotencyKey:
      `ticket-purchase:${purchase.id}`,
  });
}