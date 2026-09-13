import crypto from "crypto";

import { prisma } from "../../lib/prisma";

/*
|--------------------------------------------------------------------------
| Pass Number
|--------------------------------------------------------------------------
*/

function generatePassNumber() {
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

function generateQrToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

/*
|--------------------------------------------------------------------------
| NFC Token
|--------------------------------------------------------------------------
*/

function generateNfcToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
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
  | Purchase
  |--------------------------------------------------------------------------
  */

  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id: purchaseId,
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
  | Purchase Status
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
  | Fast Idempotency Check
  |--------------------------------------------------------------------------
  */

  if (
    purchase.passes.length > 0
  ) {
    return purchase.passes;
  }

  /*
  |--------------------------------------------------------------------------
  | Transaction
  |--------------------------------------------------------------------------
  |
  | The purchase row is locked before checking/creating passes.
  |
  | This prevents duplicate pass issuance if Revolut delivers the same
  | webhook more than once at nearly the same time.
  |
  */

  return prisma.$transaction(
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
            id: purchaseId,
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
      | Idempotency
      |--------------------------------------------------------------------------
      |
      | Check again AFTER acquiring the row lock.
      |
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

      const passes = [];

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

        passes.push(pass);
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
              lockedPurchase.quantity === 1
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

      return passes;
    },
  );
}