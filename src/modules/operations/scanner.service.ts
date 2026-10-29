
import { prisma } from "../../lib/prisma";
import { verifyPassToken } from "../pass/pass.jwt";
import { eventBus } from "../../core/events/event-bus";
import { Events } from "../../core/events/event.types";

async function resolveScannedPass(token: string, eventId: string) {
  const scannedToken = token.trim();

  if (!scannedToken) {
    throw new Error("Invalid ticket QR code.");
  }

  // Legacy QR: the original 64-character hexadecimal EventPass.qrToken.
  if (/^[a-fA-F0-9]{64}$/.test(scannedToken)) {
    const pass = await prisma.eventPass.findUnique({
      where: { qrToken: scannedToken },
      include: {
        purchase: {
          include: {
            user: true,
            ticket: true,
            event: true,
          },
        },
      },
    });

    if (!pass) {
      throw new Error("Pass not found.");
    }

    const purchase = pass.purchase;

    if (purchase.eventId !== eventId) {
      throw new Error("This ticket belongs to another event.");
    }

    if (purchase.status !== "PAID") {
      throw new Error("Ticket has not been paid.");
    }

    if (!pass.isActive || pass.isRevoked) {
      throw new Error("This pass is inactive or revoked.");
    }

    if (pass.expiresAt && pass.expiresAt <= new Date()) {
      throw new Error("This pass has expired.");
    }

    return { purchase, pass };
  }

  // Existing signed JWT format.
  const payload = verifyPassToken(scannedToken) as {
    purchaseId: string;
    eventId: string;
    userId: string;
  };

  if (payload.eventId !== eventId) {
    throw new Error("This ticket belongs to another event.");
  }

  const purchase = await prisma.ticketPurchase.findUnique({
    where: { id: payload.purchaseId },
    include: {
      user: true,
      ticket: true,
      event: true,
      passes: true,
    },
  });

  if (!purchase) {
    throw new Error("Pass not found.");
  }

  if (purchase.status !== "PAID") {
    throw new Error("Ticket has not been paid.");
  }

  const pass = purchase.passes.find(
    (item) =>
      item.isActive &&
      !item.isRevoked &&
      (!item.expiresAt || item.expiresAt > new Date()),
  );

  if (!pass) {
    throw new Error("No active pass was found for this ticket.");
  }

  return { purchase, pass };
}

export async function verifyPass(token: string, eventId: string) {
  const { purchase } = await resolveScannedPass(token, eventId);

  return {
    purchase,
    alreadyCheckedIn: purchase.checkedIn,
  };
}

export async function checkIn(
  token: string,
  staff: {
    id: string;
    eventId: string;
    station?: string | null;
  },
) {
  const { purchase } = await resolveScannedPass(token, staff.eventId);

  if (purchase.checkedIn) {
    throw new Error("Attendee has already checked in.");
  }

  await prisma.$transaction(async (tx) => {
    // Recheck inside the transaction to reduce duplicate check-in races.
    const current = await tx.ticketPurchase.findUnique({
      where: { id: purchase.id },
      select: { checkedIn: true, status: true },
    });

    if (!current || current.status !== "PAID") {
      throw new Error("Ticket has not been paid.");
    }

    if (current.checkedIn) {
      throw new Error("Attendee has already checked in.");
    }

    await tx.ticketPurchase.update({
      where: { id: purchase.id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
      },
    });

    await tx.ticketCheckIn.create({
      data: {
        purchaseId: purchase.id,
        checkedInBy: staff.id,
        station: staff.station,
      },
    });
  });

  const attendance = await prisma.ticketPurchase.count({
    where: {
      eventId: purchase.eventId,
      checkedIn: true,
    },
  });

  const checkedInAt = new Date();

  eventBus.emit(Events.ATTENDEE_CHECKED_IN, {
    eventId: purchase.eventId,
    purchaseId: purchase.id,
    attendeeId: purchase.userId,
    ticketTypeId: purchase.ticketTypeId,
    staffId: staff.id,
    station: staff.station,
    attendance,
    checkedInAt,
  });

  return {
    success: true,
    attendance,
    attendee: {
      id: purchase.user.id,
      firstName: purchase.user.firstName,
      lastName: purchase.user.lastName,
      email: purchase.user.email,
    },
    ticket: {
      id: purchase.ticket.id,
      name: purchase.ticket.name,
      price: purchase.ticket.price,
    },
    event: {
      id: purchase.event.id,
      title: purchase.event.title,
    },
  };
}
