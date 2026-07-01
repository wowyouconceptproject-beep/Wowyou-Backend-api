import { prisma } from "../../lib/prisma";

import { verifyPassToken } from "../pass/pass.jwt";

import { eventBus } from "../../core/events/event-bus";
import { Events } from "../../core/events/event.types";

export async function verifyPass(
  token: string,
  eventId: string
) {
  const payload =
    verifyPassToken(token) as {
      purchaseId: string;
      eventId: string;
      userId: string;
    };

  if (payload.eventId !== eventId) {
    throw new Error(
      "This ticket belongs to another event."
    );
  }

  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id: payload.purchaseId,
      },
      include: {
        user: true,
        ticket: true,
        event: true,
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

  return {
    purchase,
    alreadyCheckedIn:
      purchase.checkedIn,
  };
}

export async function checkIn(
  token: string,
  staff: {
    id: string;
    eventId: string;
    station?: string | null;
  }
) {
  const payload =
    verifyPassToken(token) as {
      purchaseId: string;
      eventId: string;
      userId: string;
    };

  if (
    payload.eventId !==
    staff.eventId
  ) {
    throw new Error(
      "This ticket belongs to another event."
    );
  }

  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id: payload.purchaseId,
      },
      include: {
        event: true,
        user: true,
        ticket: true,
      },
    });

  if (!purchase) {
    throw new Error(
      "Pass not found."
    );
  }

  if (
    purchase.status !==
    "PAID"
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
        checkedInAt: new Date(),
      },
    }),

    prisma.ticketCheckIn.create({
      data: {
        purchaseId: purchase.id,
        checkedInBy: staff.id,
        station: staff.station,
      },
    }),
  ]);

  const attendance =
    await prisma.ticketPurchase.count({
      where: {
        eventId: purchase.eventId,
        checkedIn: true,
      },
    });

  eventBus.emit(
    Events.ATTENDEE_CHECKED_IN,
    {
      eventId:
        purchase.eventId,

      purchaseId:
        purchase.id,

      attendeeId:
        purchase.userId,

      ticketTypeId:
        purchase.ticketTypeId,

      staffId:
        staff.id,

      station:
        staff.station,

      attendance,

      checkedInAt:
        new Date(),
    }
  );

  return {
    success: true,

    attendance,

    attendee: {
      id: purchase.user.id,
      firstName:
        purchase.user.firstName,
      lastName:
        purchase.user.lastName,
      email:
        purchase.user.email,
    },

    ticket: {
      id: purchase.ticket.id,
      name:
        purchase.ticket.name,
      price:
        purchase.ticket.price,
    },

    event: {
      id: purchase.event.id,
      title:
        purchase.event.title,
    },
  };
}

export async function undoCheckIn(
  purchaseId: string,
  staff: {
    id: string;
    eventId: string;
  }
) {
  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id: purchaseId,
      },
    });

  if (!purchase) {
    throw new Error(
      "Purchase not found."
    );
  }

  if (
    purchase.eventId !==
    staff.eventId
  ) {
    throw new Error(
      "Invalid event."
    );
  }

  if (
    !purchase.checkedIn
  ) {
    throw new Error(
      "Attendee has not checked in."
    );
  }

  await prisma.$transaction([
    prisma.ticketPurchase.update({
      where: {
        id: purchase.id,
      },
      data: {
        checkedIn: false,
        checkedInAt: null,
      },
    }),

    prisma.ticketCheckIn.delete({
      where: {
        purchaseId:
          purchase.id,
      },
    }),
  ]);

  eventBus.emit(
    Events.ATTENDEE_UNCHECKED,
    {
      purchaseId:
        purchase.id,

      eventId:
        purchase.eventId,

      staffId:
        staff.id,
    }
  );

  return {
    success: true,
  };
}

export async function manualCheckIn(
  purchaseId: string,
  staff: {
    id: string;
    eventId: string;
    station?: string | null;
  }
) {
  const purchase =
    await prisma.ticketPurchase.findUnique({
      where: {
        id: purchaseId,
      },
      include: {
        user: true,
        ticket: true,
        event: true,
      },
    });

  if (!purchase) {
    throw new Error(
      "Purchase not found."
    );
  }

  if (
    purchase.eventId !==
    staff.eventId
  ) {
    throw new Error(
      "Invalid event."
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
        checkedInAt: new Date(),
      },
    }),

    prisma.ticketCheckIn.create({
      data: {
        purchaseId:
          purchase.id,
        checkedInBy:
          staff.id,
        station:
          staff.station,
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

  eventBus.emit(
    Events.ATTENDEE_CHECKED_IN,
    {
      eventId:
        purchase.eventId,

      purchaseId:
        purchase.id,

      attendeeId:
        purchase.userId,

      ticketTypeId:
        purchase.ticketTypeId,

      staffId:
        staff.id,

      station:
        staff.station,

      attendance,

      checkedInAt:
        new Date(),
    }
  );

  return {
    success: true,
    attendance,
  };
}

export async function searchAttendee(
  eventId: string,
  query: string
) {
  return prisma.ticketPurchase.findMany({
    where: {
      eventId,

      status: "PAID",

      OR: [
        {
          user: {
            firstName: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            lastName: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      ],
    },

    include: {
      user: true,
      ticket: true,
    },

    take: 20,
  });
}

async function completeCheckIn(
  purchase: any,
  staff: {
    id: string;
    eventId: string;
    station?: string | null;
  }
) {
  if (purchase.checkedIn) {
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
        checkedInAt: new Date(),
      },
    }),

    prisma.ticketCheckIn.create({
      data: {
        purchaseId: purchase.id,
        checkedInBy: staff.id,
        station: staff.station,
      },
    }),
  ]);

  const attendance =
    await prisma.ticketPurchase.count({
      where: {
        eventId: purchase.eventId,
        checkedIn: true,
      },
    });

  eventBus.emit(
    Events.ATTENDEE_CHECKED_IN,
    {
      purchaseId: purchase.id,

      attendeeId: purchase.userId,

      eventId: purchase.eventId,

      ticketTypeId:
        purchase.ticketTypeId,

      staffId: staff.id,

      station: staff.station,

      attendance,

      checkedInAt:
        new Date(),
    }
  );

  return {
    success: true,

    attendance,

    attendee: purchase.user,

    ticket: purchase.ticket,

    event: purchase.event,
  };
}