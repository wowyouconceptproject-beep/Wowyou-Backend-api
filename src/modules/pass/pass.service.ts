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

  /*
  |--------------------------------------------------------------------------
  | Purchase
  |--------------------------------------------------------------------------
  */

  if (!purchase) {
    throw new Error(
      "Pass not found.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Ownership
  |--------------------------------------------------------------------------
  */

  if (
    purchase.userId !==
    userId
  ) {
    throw new Error(
      "Unauthorized.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Payment
  |--------------------------------------------------------------------------
  */

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
  | Passes
  |--------------------------------------------------------------------------
  */

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
| Generates a signed JWT for every issued EventPass.
|
| The JWT contains the permanent pass credentials required to
| validate the pass during scanning.
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
| Verifies a signed EventPass JWT.
|
| Validation includes:
|
| • JWT signature
| • Purchase ownership
| • Pass ownership
| • Event ownership
| • User ownership
| • Pass number
| • QR credential
| • NFC credential
| • Payment status
| • Active status
| • Revocation status
| • Pass expiration
| • Event expiration
|
*/

export async function verifySecurePass(
  token: string,
) {
  /*
  |--------------------------------------------------------------------------
  | Verify JWT
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Validate JWT Payload
  |--------------------------------------------------------------------------
  */

  if (
    !payload ||
    !payload.purchaseId ||
    !payload.passId ||
    !payload.passNumber ||
    !payload.qrToken ||
    !payload.eventId ||
    !payload.userId
  ) {
    throw new Error(
      "Invalid pass token.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Get Pass
  |--------------------------------------------------------------------------
  */

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
  | Pass Exists
  |--------------------------------------------------------------------------
  */

  if (!pass) {
    throw new Error(
      "Pass not found.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Purchase Ownership
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
  | Purchase
  |--------------------------------------------------------------------------
  */

  const purchase =
    pass.purchase;

  /*
  |--------------------------------------------------------------------------
  | Event Validation
  |--------------------------------------------------------------------------
  */

  if (
    purchase.eventId !==
    payload.eventId
  ) {
    throw new Error(
      "Invalid event.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | User Validation
  |--------------------------------------------------------------------------
  */

  if (
    purchase.userId !==
    payload.userId
  ) {
    throw new Error(
      "Invalid pass owner.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Pass Number Validation
  |--------------------------------------------------------------------------
  */

  if (
    pass.passNumber !==
    payload.passNumber
  ) {
    throw new Error(
      "Invalid pass number.",
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
  | NFC Validation
  |--------------------------------------------------------------------------
  |
  | Some older passes may not have an NFC credential.
  | When one exists, the JWT must match it.
  |
  */

  if (
    pass.nfcToken &&
    payload.nfcToken !==
      pass.nfcToken
  ) {
    throw new Error(
      "NFC token is invalid.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Payment Validation
  |--------------------------------------------------------------------------
  */

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
  | Active Validation
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
  | Revoked Validation
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
  | Expiration
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
              purchase.checkIn
                .staff.id,

            name:
              purchase.checkIn
                .staff.name,

            station:
              purchase.checkIn
                .station,

            checkedInAt:
              purchase.checkIn
                .checkedInAt,
          }
        : null,
  };
}