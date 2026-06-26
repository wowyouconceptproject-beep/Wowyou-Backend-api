import { prisma } from "../../lib/prisma";

import {
  generatePassToken,
} from "./pass.jwt";

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
      "Pass not found"
    );
  }

  if (
    purchase.userId !==
    userId
  ) {
    throw new Error(
      "Unauthorized"
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
    purchase.status !==
    "PAID"
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