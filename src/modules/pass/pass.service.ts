import { prisma } from "../../lib/prisma";

import {
  generatePassToken,
  verifyPassToken,
} from "./pass.jwt";

/*
|--------------------------------------------------------------------------
| Get Event Pass
|--------------------------------------------------------------------------
*/

export async function getEventPass(
  purchaseId: string,
  userId: string,
) {
  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id: purchaseId,
      },

      include: {
        user: true,

        event: true,

        ticket: true,

        passes: {
          where: {
            isActive: true,

            isRevoked: false,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

  if (!purchase) {
    throw new Error(
      "Pass not found.",
    );
  }

  if (
    purchase.userId !== userId
  ) {
    throw new Error(
      "Unauthorized.",
    );
  }

  if (
    purchase.status !==
    "PAID"
  ) {
    throw new Error(
      "Ticket has not been paid.",
    );
  }

  if (
    purchase.event.endDate <
    new Date()
  ) {
    throw new Error(
      "Event has ended.",
    );
  }

  if (
    purchase.passes.length ===
    0
  ) {
    throw new Error(
      "No event passes have been issued.",
    );
  }

  return purchase;
}

/*
|--------------------------------------------------------------------------
| Generate Secure Pass
|--------------------------------------------------------------------------
|
| Generates secure JWTs for every issued EventPass.
|
| QR and NFC tokens remain the permanent credentials.
|
*/

export async function generateSecurePass(
  purchaseId: string,
  userId: string,
) {
  const purchase =
    await getEventPass(
      purchaseId,
      userId,
    );

  const passes =
    purchase.passes.map(
      (pass) => {
        const token =
          generatePassToken({
            purchaseId:
              purchase.id,

            passId:
              pass.id,

            passNumber:
              pass.passNumber,

            qrToken:
              pass.qrToken,

            nfcToken:
              pass.nfcToken,

            eventId:
              purchase.eventId,

            userId:
              purchase.userId,
          });

        return {
          id:
            pass.id,

          passNumber:
            pass.passNumber,

          qrToken:
            pass.qrToken,

          nfcToken:
            pass.nfcToken,

          token,

          issuedAt:
            pass.issuedAt,

          expiresAt:
            pass.expiresAt,

          active:
            pass.isActive,

          revoked:
            pass.isRevoked,

          nfcEnabled:
            pass.nfcEnabled,
        };
      },
    );

  return {
    purchase,

    passes,
  };
}

/*
|--------------------------------------------------------------------------
| Verify Secure Pass
|--------------------------------------------------------------------------
|
| Verifies an issued EventPass.
|
| Supports:
|
| • QR Tokens
| • NFC Tokens
| • JWT Pass Tokens
|
*/

export async function verifySecurePass(
  token: string,
) {
  const payload =
    verifyPassToken(token) as {
      purchaseId: string;

      passId: string;

      passNumber: string;

      qrToken: string;

      nfcToken: string;

      eventId: string;

      userId: string;
    };

  const pass =
    await prisma.eventPass.findUnique({
      where: {
        id:
          payload.passId,
      },

      include: {
        purchase: {
          include: {
            user: true,

            event: true,

            ticket: true,

            checkIn: {
              include: {
                staff: true,
              },
            },
          },
        },
      },
    });

  /*
  |--------------------------------------------------------------------------
  | Pass
  |--------------------------------------------------------------------------
  */

  if (!pass) {
    throw new Error(
      "Pass not found.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Ownership Validation
  |--------------------------------------------------------------------------
  */

  if (
    pass.purchaseId !==
    payload.purchaseId
  ) {
    throw new Error(
      "Invalid pass.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | QR Validation
  |--------------------------------------------------------------------------
  */

  if (
    pass.qrToken !==
    payload.qrToken
  ) {
    throw new Error(
      "QR token is invalid.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Purchase
  |--------------------------------------------------------------------------
  */

  const purchase =
    pass.purchase;

  if (
    purchase.status !==
    "PAID"
  ) {
    throw new Error(
      "Ticket has not been paid.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Active
  |--------------------------------------------------------------------------
  */

  if (
    !pass.isActive
  ) {
    throw new Error(
      "This pass is inactive.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Revoked
  |--------------------------------------------------------------------------
  */

  if (
    pass.isRevoked
  ) {
    throw new Error(
      "This pass has been revoked.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Expired
  |--------------------------------------------------------------------------
  */

  if (
    pass.expiresAt &&
    pass.expiresAt <
      new Date()
  ) {
    throw new Error(
      "This pass has expired.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Event Ended
  |--------------------------------------------------------------------------
  */

  if (
    purchase.event.endDate <
    new Date()
  ) {
    throw new Error(
      "Event has ended.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Success
  |--------------------------------------------------------------------------
  */

  return {
    pass,

    purchase,

    attendee: {
      id:
        purchase.user.id,

      name:
        `${purchase.user.firstName} ${purchase.user.lastName}`,

      email:
        purchase.user.email,
    },

    ticket: {
      id:
        purchase.ticket.id,

      name:
        purchase.ticket.name,
    },

    event: {
      id:
        purchase.event.id,

      title:
        purchase.event.title,
    },

    alreadyCheckedIn:
      purchase.checkedIn,

    checkedInBy:
      purchase.checkIn
        ? {
            id:
              purchase.checkIn.staff.id,

            name:
              purchase.checkIn.staff.name,

            station:
              purchase.checkIn.station,

            checkedInAt:
              purchase.checkIn.checkedInAt,
          }
        : null,
  };
}