import crypto from "crypto";
import QRCode from "qrcode";

import { prisma } from "../../lib/prisma";

import { sendEmail } from "../email/email.service";

import {
  ticketPurchaseEmailTemplate,
  organizerTicketSaleEmailTemplate,
} from "../email/email.templates";

/*
|--------------------------------------------------------------------------
| Pass Number
|--------------------------------------------------------------------------
*/

function generatePassNumber(): string {
  return `WY-${crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase()}`;
}

/*
|--------------------------------------------------------------------------
| QR Token
|--------------------------------------------------------------------------
*/

function generateQrToken(): string {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

/*
|--------------------------------------------------------------------------
| NFC Token
|--------------------------------------------------------------------------
*/

function generateNfcToken(): string {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

/*
|--------------------------------------------------------------------------
| Send Attendee Ticket Purchase Email
|--------------------------------------------------------------------------
|
| SOURCE OF TRUTH:
|
| The attendee email comes ONLY from:
|
|     purchase.user.email
|
| This email contains the attendee's ticket and QR code.
|
| It must NEVER use the organization owner email.
|
|--------------------------------------------------------------------------
*/

async function sendTicketPurchaseEmail(
  purchaseId: string,
) {
  /*
  |--------------------------------------------------------------------------
  | Check Existing Delivery
  |--------------------------------------------------------------------------
  */

  const existingDelivery =
    await prisma.emailDelivery.findFirst({
      where: {
        purchaseId,

        type:
          "TICKET_PURCHASE",

        status:
          "SENT",
      },

      orderBy: {
        createdAt:
          "desc",
      },
    });

  if (existingDelivery) {
    return {
      success: true,

      alreadySent: true,

      messageId:
        existingDelivery.providerMessageId ??
        undefined,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Load Purchase
  |--------------------------------------------------------------------------
  */

  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id: purchaseId,
      },

      include: {
        /*
        |--------------------------------------------------------------------------
        | Attendee
        |--------------------------------------------------------------------------
        |
        | THIS IS THE SOURCE OF TRUTH FOR THE ATTENDEE EMAIL.
        |
        */

        user: true,

        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            venue: true,
          },
        },

        ticket: true,

        passes: {
          where: {
            isActive: true,

            isRevoked: false,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        },
      },
    });

  if (!purchase) {
    throw new Error(
      "Purchase not found while sending attendee ticket email.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Purchase
  |--------------------------------------------------------------------------
  */

  if (
    purchase.status !==
    "PAID"
  ) {
    throw new Error(
      "Cannot send attendee ticket email for an unpaid purchase.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Passes
  |--------------------------------------------------------------------------
  */

  if (
    purchase.passes.length ===
    0
  ) {
    throw new Error(
      "Cannot send attendee ticket email because no passes have been issued.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Attendee Email
  |--------------------------------------------------------------------------
  |
  | Normalize the attendee email independently.
  |
  */

  const attendeeEmail =
    purchase.user.email
      ?.trim()
      .toLowerCase();

  if (!attendeeEmail) {
    throw new Error(
      "Attendee email address not found.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Primary Pass
  |--------------------------------------------------------------------------
  */

  const primaryPass =
    purchase.passes[0];

  /*
  |--------------------------------------------------------------------------
  | Generate QR Image
  |--------------------------------------------------------------------------
  */

  const qrBuffer =
    await QRCode.toBuffer(
      primaryPass.qrToken,
      {
        type:
          "png",

        width:
          600,

        margin:
          2,

        errorCorrectionLevel:
          "M",
      },
    );

  /*
  |--------------------------------------------------------------------------
  | Build Attendee Email
  |--------------------------------------------------------------------------
  */

  const firstName =
    purchase.user.firstName
      ?.trim() ||
    "there";

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
        purchase.amount,

      currency:
        purchase.currency,

      startDate:
        purchase.event.startDate,

      venue:
        purchase.event.venue,

      ticketId:
        primaryPass.passNumber,
    });

  /*
  |--------------------------------------------------------------------------
  | Send Attendee Email
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | `to` is explicitly the attendee email.
  |
  */

  return sendEmail({
    type:
      "TICKET_PURCHASE",

    to:
      attendeeEmail,

    subject:
      template.subject,

    html:
      template.html,

    text:
      template.text,

    userId:
      purchase.userId,

    purchaseId:
      purchase.id,

    eventId:
      purchase.eventId,

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
      `ticket_purchase_${purchase.id}`,
  });
}

/*
|--------------------------------------------------------------------------
| Send Organizer Ticket Sale Email
|--------------------------------------------------------------------------
|
| SOURCE OF TRUTH:
|
| The organizer email comes ONLY from:
|
|     purchase.event.organization.owner.email
|
| This is completely separate from the attendee email.
|
|--------------------------------------------------------------------------
*/

async function sendOrganizerTicketSaleEmail(
  purchaseId: string,
) {
  /*
  |--------------------------------------------------------------------------
  | Check Existing Delivery
  |--------------------------------------------------------------------------
  */

  const existingDelivery =
    await prisma.emailDelivery.findFirst({
      where: {
        purchaseId,

        type:
          "ORGANIZER_TICKET_SALE",

        status:
          "SENT",
      },

      orderBy: {
        createdAt:
          "desc",
      },
    });

  if (existingDelivery) {
    return {
      success: true,

      alreadySent: true,

      messageId:
        existingDelivery.providerMessageId ??
        undefined,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Load Purchase
  |--------------------------------------------------------------------------
  */

  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id: purchaseId,
      },

      include: {
        /*
        |--------------------------------------------------------------------------
        | Buyer
        |--------------------------------------------------------------------------
        |
        | Used only for buyer information displayed to organizer.
        |
        */

        user: true,

        event: {
          include: {
            organization: {
              include: {
                owner: true,
              },
            },
          },
        },

        ticket: true,
      },
    });

  if (!purchase) {
    throw new Error(
      "Purchase not found while sending organizer sale email.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Purchase
  |--------------------------------------------------------------------------
  */

  if (
    purchase.status !==
    "PAID"
  ) {
    throw new Error(
      "Cannot send organizer sale email for an unpaid purchase.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Organizer
  |--------------------------------------------------------------------------
  */

  const organization =
    purchase.event.organization;

  const organizer =
    organization.owner;

  /*
  |--------------------------------------------------------------------------
  | Organizer Email
  |--------------------------------------------------------------------------
  |
  | This is intentionally NOT purchase.user.email.
  |
  */

  const organizerEmail =
    organizer?.email
      ?.trim()
      .toLowerCase();

  if (!organizerEmail) {
    throw new Error(
      "Organization owner email not found.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Buyer Information
  |--------------------------------------------------------------------------
  */

  const buyerName =
    `${purchase.user.firstName ?? ""} ${
      purchase.user.lastName ?? ""
    }`.trim();

  const buyerEmail =
    purchase.user.email
      ?.trim()
      .toLowerCase();

  /*
  |--------------------------------------------------------------------------
  | Build Organizer Email
  |--------------------------------------------------------------------------
  */

  const template =
    organizerTicketSaleEmailTemplate({
      organizationName:
        organization.name,

      eventTitle:
        purchase.event.title,

      ticketName:
        purchase.ticket.name,

      quantity:
        purchase.quantity,

      totalAmount:
        purchase.amount,

      currency:
        purchase.currency,

      buyerName:
        buyerName ||
        "Attendee",

      buyerEmail:
        buyerEmail ||
        "Unavailable",
    });

  /*
  |--------------------------------------------------------------------------
  | Send Organizer Email
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | `to` is explicitly the organizer email.
  |
  */

  return sendEmail({
    type:
      "ORGANIZER_TICKET_SALE",

    to:
      organizerEmail,

    subject:
      template.subject,

    html:
      template.html,

    text:
      template.text,

    /*
    |--------------------------------------------------------------------------
    | Delivery User
    |--------------------------------------------------------------------------
    |
    | The email recipient is the organizer, therefore the delivery record
    | belongs to the organizer.
    |
    */

    userId:
      organizer.id,

    purchaseId:
      purchase.id,

    eventId:
      purchase.eventId,

    idempotencyKey:
      `organizer_ticket_sale_${purchase.id}`,
  });
}

/*
|--------------------------------------------------------------------------
| Issue Purchase
|--------------------------------------------------------------------------
|
| Single source of truth for issuing attendee passes.
|
| Responsibilities:
|
| • Verify purchase is paid
| • Create EventPass records
| • Generate Pass Number
| • Generate QR Token
| • Generate NFC Token
| • Record PASS_ISSUED activity
| • Send attendee ticket email
| • Send organizer sale email
|
| NOT responsible for:
|
| • Payment processing
| • Inventory reservation
| • Purchase status updates
|
|--------------------------------------------------------------------------
*/

export async function issuePurchase(
  purchaseId: string,
) {
  /*
  |--------------------------------------------------------------------------
  | Initial Purchase Lookup
  |--------------------------------------------------------------------------
  */

  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id:
          purchaseId,
      },

      include: {
        user: true,

        event: true,

        ticket: true,

        passes: true,
      },
    });

  if (!purchase) {
    throw new Error(
      "Purchase not found.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Paid State
  |--------------------------------------------------------------------------
  */

  if (
    purchase.status !==
    "PAID"
  ) {
    throw new Error(
      "Purchase has not been paid.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Fast Idempotency
  |--------------------------------------------------------------------------
  |
  | If passes already exist:
  |
  | 1. Do not create them again.
  | 2. Retry attendee email if necessary.
  | 3. Retry organizer email if necessary.
  |
  */

  if (
    purchase.passes.length >
    0
  ) {
    /*
    |--------------------------------------------------------------------------
    | Attendee Email
    |--------------------------------------------------------------------------
    */

    try {
      await sendTicketPurchaseEmail(
        purchaseId,
      );
    } catch (error) {
      console.error(
        "Failed to send attendee ticket email:",
        error,
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Organizer Email
    |--------------------------------------------------------------------------
    */

    try {
      await sendOrganizerTicketSaleEmail(
        purchaseId,
      );
    } catch (error) {
      console.error(
        "Failed to send organizer ticket sale email:",
        error,
      );
    }

    return purchase.passes;
  }

  /*
  |--------------------------------------------------------------------------
  | Transaction
  |--------------------------------------------------------------------------
  */

  const passes =
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
          WHERE id = ${purchaseId}
          FOR UPDATE
        `;

        /*
        |--------------------------------------------------------------------------
        | Re-fetch Purchase State
        |--------------------------------------------------------------------------
        */

        const lockedPurchase =
          await tx.ticketPurchase.findUnique({
            where: {
              id:
                purchaseId,
            },

            include: {
              event: true,

              ticket: true,

              passes: true,
            },
          });

        if (!lockedPurchase) {
          throw new Error(
            "Purchase not found.",
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Verify Paid State
        |--------------------------------------------------------------------------
        */

        if (
          lockedPurchase.status !==
          "PAID"
        ) {
          throw new Error(
            "Purchase has not been paid.",
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Idempotency After Lock
        |--------------------------------------------------------------------------
        */

        if (
          lockedPurchase.passes.length >
          0
        ) {
          return lockedPurchase.passes;
        }

        /*
        |--------------------------------------------------------------------------
        | Create Event Passes
        |--------------------------------------------------------------------------
        */

        const createdPasses =
          [];

        for (
          let i = 0;
          i <
          lockedPurchase.quantity;
          i++
        ) {
          const pass =
            await tx.eventPass.create({
              data: {
                purchaseId:
                  lockedPurchase.id,

                passNumber:
                  generatePassNumber(),

                qrToken:
                  generateQrToken(),

                nfcToken:
                  generateNfcToken(),

                isActive:
                  true,

                isRevoked:
                  false,

                nfcEnabled:
                  true,

                issuedAt:
                  new Date(),
              },
            });

          createdPasses.push(
            pass,
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Activity
        |--------------------------------------------------------------------------
        */

        await tx.eventActivity.create({
          data: {
            eventId:
              lockedPurchase.eventId,

            purchaseId:
              lockedPurchase.id,

            type:
              "PASS_ISSUED",

            title:
              "Ticket Issued",

            description:
              `${lockedPurchase.quantity} pass${
                lockedPurchase.quantity ===
                1
                  ? ""
                  : "es"
              } issued.`,

            payload: {
              paymentProvider:
                lockedPurchase.paymentProvider,

              quantity:
                lockedPurchase.quantity,

              ticketType:
                lockedPurchase.ticket.name,
            },
          },
        });

        return createdPasses;
      },
    );

  /*
  |--------------------------------------------------------------------------
  | Post-Transaction Attendee Email
  |--------------------------------------------------------------------------
  |
  | The transaction has already committed.
  |
  | Email failure must NEVER invalidate an already-issued ticket.
  |
  */

  try {
    await sendTicketPurchaseEmail(
      purchaseId,
    );
  } catch (error) {
    console.error(
      "Failed to send attendee ticket email:",
      error,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Post-Transaction Organizer Email
  |--------------------------------------------------------------------------
  */

  try {
    await sendOrganizerTicketSaleEmail(
      purchaseId,
    );
  } catch (error) {
    console.error(
      "Failed to send organizer ticket sale email:",
      error,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Return Passes
  |--------------------------------------------------------------------------
  */

  return passes;
}