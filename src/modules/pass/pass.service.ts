import { prisma } from "../../lib/prisma";

import {
  generatePassToken,
  verifyPassToken,
} from "./pass.jwt";

import {
  attendanceUpdated,
  notifyAttendee,
} from "../../realtime";

export async function getEventPass(
  purchaseId: string,
  userId: string
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
      },
    });

  if (!purchase) {
    throw new Error(
      "Pass not found."
    );
  }

  if (
    purchase.userId !== userId
  ) {
    throw new Error(
      "Unauthorized."
    );
  }

  return purchase;
}

export async function generateSecurePass(
  purchaseId: string,
  userId: string
) {
  const purchase =
    await getEventPass(
      purchaseId,
      userId
    );

  if (
    purchase.status !== "PAID"
  ) {
    throw new Error(
      "Ticket has not been paid for."
    );
  }

  if (
    purchase.checkedIn
  ) {
    throw new Error(
      "This pass has already been used."
    );
  }

  if (
    purchase.event.endDate <
    new Date()
  ) {
    throw new Error(
      "Event has ended."
    );
  }

  const token =
    generatePassToken({
      purchaseId:
        purchase.id,
      eventId:
        purchase.eventId,
      userId:
        purchase.userId,
    });

  return {
    token,
  };
}

export async function verifySecurePass(
  token: string
) {
  const payload =
    verifyPassToken(token) as {
      purchaseId: string;
      eventId: string;
      userId: string;
    };

  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id: payload.purchaseId,
      },
      include: {
        user: true,
        event: true,
        ticket: true,
      },
    });

  if (!purchase) {
    throw new Error(
      "Pass not found."
    );
  }

  if (
    purchase.status !== "PAID"
  ) {
    throw new Error(
      "Ticket not paid."
    );
  }

  return {
    purchase,
    alreadyCheckedIn:
      purchase.checkedIn,
  };
}

export async function checkInPass(
  token: string,
  organizerId: string
) {
  const payload =
    verifyPassToken(token) as {
      purchaseId: string;
    };

  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id: payload.purchaseId,
      },
      include: {
        user: true,
        event: true,
        ticket: true,
      },
    });

  if (!purchase) {
    throw new Error(
      "Pass not found."
    );
  }

  if (
    purchase.status !== "PAID"
  ) {
    throw new Error(
      "Ticket has not been paid."
    );
  }

  if (
    purchase.checkedIn
  ) {
    throw new Error(
      "Attendee has already checked in."
    );
  }

  await prisma.$transaction([
    prisma.ticketPurchase.update({
      where: {
        id: purchase.id,
      },
      data: {
        checkedIn: true,
        checkedInAt:
          new Date(),
      },
    }),

    prisma.ticketCheckIn.create({
      data: {
        purchaseId:
          purchase.id,
        checkedInBy:
          organizerId,
      },
    }),
  ]);

  const attendance =
    await prisma.ticketPurchase.count({
      where: {
        eventId:
          purchase.eventId,
        checkedIn: true,
      },
    });

  // Realtime attendance update
 attendanceUpdated(purchase.eventId, {
  checkedIn: attendance,
  purchaseId: purchase.id,
  attendeeId: purchase.userId,
  ticketTypeId: purchase.ticketTypeId,
  checkedInAt: new Date().toISOString(),
});

  // Notify attendee
  notifyAttendee(
    purchase.userId,
    {
      type: "CHECK_IN_SUCCESS",

      title:
        "Welcome!",

      message:
        "You have successfully checked in.",

      eventId:
        purchase.eventId,

      purchaseId:
        purchase.id,

      checkedInAt:
        new Date().toISOString(),
    }
  );

  return {
    attendance,
    purchase,
  };
}