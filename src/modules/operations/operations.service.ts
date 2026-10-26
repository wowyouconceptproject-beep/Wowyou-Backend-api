import {
  verifyRotatingQrPass,
  verifySecurePass,
} from "../pass/pass.service";

import { prisma } from "../../lib/prisma";

import { generateOpsToken } from "./ops.jwt";

import { staffOnline } from "../../realtime";

import {
  attendanceUpdated,
  activityCreated,
  notifyAttendee,
  ActivityType,
} from "../../realtime";

import {
  eventBus,
} from "../../core/events/event-bus";

import {
  Events,
} from "../../core/events/event.types";

export async function access(
  accessCode: string,
  device: {
    deviceId?: string;
    deviceName?: string;
    platform?: string;
    appVersion?: string;
    ipAddress?: string;
  }
) {
  const staff =
    await prisma.eventStaff.findUnique({
      where: {
        accessCode,
      },
      include: {
        event: true,
      },
    });

  if (!staff) {
    throw new Error(
      "Invalid access code."
    );
  }

  if (!staff.isActive) {
    throw new Error(
      "Staff account has been disabled."
    );
  }

  if (staff.isRevoked) {
    throw new Error(
      "Access code has been revoked."
    );
  }

  if (
    staff.expiresAt &&
    staff.expiresAt < new Date()
  ) {
    throw new Error(
      "Access code has expired."
    );
  }

  if (
    staff.event.status !==
    "PUBLISHED"
  ) {
    throw new Error(
      "This event is not available."
    );
  }

  const token =
    generateOpsToken({
      staffId: staff.id,
      eventId: staff.eventId,
      role: staff.role,
      station: staff.station,
      permissions:
        staff.permissions,
    });

  await prisma.$transaction(
    async (tx) => {
      // Close any previous sessions
      await tx.operationSession.updateMany({
        where: {
          staffId: staff.id,
          isActive: true,
        },
        data: {
          isActive: false,
          endedAt: new Date(),
        },
      });

      // Create new session
      await tx.operationSession.create({
        data: {
          staffId: staff.id,

          token,

          deviceId:
            device.deviceId,

          deviceName:
            device.deviceName,

          ipAddress:
            device.ipAddress,
        },
      });

      // Update last activity
      await tx.eventStaff.update({
        where: {
          id: staff.id,
        },
        data: {
          lastUsedAt: new Date(),
        },
      });
    }
  );

  // Emit realtime event AFTER transaction succeeds
  staffOnline({
    eventId: staff.eventId,

    id: staff.id,

    name: staff.name,

    role: staff.role,
  });

  return {
    token,

    staff: {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      station: staff.station,
      permissions:
        staff.permissions,
    },

    event: {
      id: staff.event.id,
      title: staff.event.title,
      venue: staff.event.venue,
      startDate:
        staff.event.startDate,
      endDate:
        staff.event.endDate,
      status:
        staff.event.status,
    },
  };
}

/*
|--------------------------------------------------------------------------
| Verify Pass
|--------------------------------------------------------------------------
*/


/**
 * Verify either the legacy permanent QR hash or the current rotating QR token.
 * NFC verification intentionally remains separate and uses verifySecurePass().
 */
async function verifyQrPassToken(token: string) {
  const normalizedToken = token.trim();

  // Legacy permanent QR codes are 64-character hexadecimal hashes.
  if (/^[a-fA-F0-9]{64}$/.test(normalizedToken)) {
    const pass = await prisma.eventPass.findUnique({
      where: {
        qrToken: normalizedToken,
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
                createdAt: "asc",
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

    if (!pass) {
      throw new Error("Pass not found.");
    }

    const purchase = pass.purchase;

    if (purchase.status !== "PAID") {
      throw new Error("Ticket has not been paid.");
    }

    if (!pass.isActive) {
      throw new Error("This pass is inactive.");
    }

    if (pass.isRevoked) {
      throw new Error("This pass has been revoked.");
    }

    if (pass.expiresAt && pass.expiresAt < new Date()) {
      throw new Error("This pass has expired.");
    }

    if (purchase.event.endDate < new Date()) {
      throw new Error("Event has ended.");
    }

    return {
      pass,
      purchase,
      attendee: {
        id: purchase.user.id,
        name: `${purchase.user.firstName} ${purchase.user.lastName}`,
        email: purchase.user.email,
      },
      ticket: {
        id: purchase.ticket.id,
        name: purchase.ticket.name,
      },
      event: {
        id: purchase.event.id,
        title: purchase.event.title,
      },
      alreadyCheckedIn: purchase.checkedIn,
      checkedInBy: purchase.checkIn
        ? {
            id: purchase.checkIn.staff.id,
            name: purchase.checkIn.staff.name,
            station: purchase.checkIn.station,
            checkedInAt: purchase.checkIn.checkedInAt,
          }
        : null,
    };
  }

  // New rotating QR codes are signed tokens and are verified by the existing
  // rotating-token verifier.
  return verifyRotatingQrPass(normalizedToken);
}

export async function verifyPass(
  token: string,
  eventId: string
) {
  const verification = await verifyQrPassToken(token);

  if (verification.event.id !== eventId) {
    throw new Error("This pass belongs to another event.");
  }

  return {
    purchase: verification.purchase,
    alreadyCheckedIn: verification.alreadyCheckedIn,
    checkedInBy: verification.checkedInBy,
  };
}
/*
|--------------------------------------------------------------------------
| Complete Check In (Private)
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Complete Check In (Private)
|--------------------------------------------------------------------------
*/

async function completeCheckIn(
  purchaseId: string,
  staff: {
    id: string;
    eventId: string;
    station?: string | null;
  }
) {
  const purchase = await prisma.ticketPurchase.findUnique({
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
    throw new Error("Purchase not found.");
  }

  if (purchase.eventId !== staff.eventId) {
    throw new Error("Invalid event.");
  }

  if (purchase.status !== "PAID") {
    throw new Error("Ticket has not been paid.");
  }

  if (purchase.checkedIn) {
    throw new Error("Attendee has already checked in.");
  }

  // Resolve the actual Attendee record.
  // User IDs and Attendee IDs are different identifiers.
  const attendee = await prisma.attendee.findUnique({
    where: {
      eventId_userId: {
        eventId: purchase.eventId,
        userId: purchase.userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!attendee) {
    throw new Error(
      "Attendee registration not found for this event. Check-in was not completed."
    );
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.ticketPurchase.update({
      where: {
        id: purchase.id,
      },
      data: {
        checkedIn: true,
        checkedInAt: now,
      },
    }),

    prisma.ticketCheckIn.create({
      data: {
        purchaseId: purchase.id,
        checkedInBy: staff.id,
        station: staff.station,
      },
    }),

    prisma.eventActivity.create({
      data: {
        eventId: purchase.eventId,
        actorId: staff.id,

        // Correct foreign key: Attendee.id, not User.id.
        attendeeId: attendee.id,

        purchaseId: purchase.id,
        ticketTypeId: purchase.ticketTypeId,
        station: staff.station,
        type: "CHECK_IN",
        title: "Attendee Checked In",
        description:
          `${purchase.user.firstName} ${purchase.user.lastName} checked in.`,
      },
    }),
  ]);

  return {
    success: true,
    purchaseId: purchase.id,
    attendeeId: attendee.id,
    checkedInAt: now,
  };
}

/*
|--------------------------------------------------------------------------
| QR Check In
|--------------------------------------------------------------------------
*/


export async function checkIn(
  token: string,
  staff: {
    id: string;
    eventId: string;
    station?: string | null;
  },
  scanType: "QR" | "NFC" = "QR",
) {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("Pass token is required.");
  }

  const normalizedToken = token.trim();

  let verification;

  switch (scanType) {
    case "QR":
      verification = await verifyQrPassToken(normalizedToken);
      break;

    case "NFC":
      verification = await verifySecurePass(normalizedToken);
      break;

    default:
      throw new Error("Unsupported scan type.");
  }

  if (verification.purchase.eventId !== staff.eventId) {
    throw new Error("This ticket belongs to another event.");
  }

  return completeCheckIn(verification.purchase.id, staff);
}
/*
|--------------------------------------------------------------------------
| Manual Check In
|--------------------------------------------------------------------------
*/

export async function manualCheckIn(
  purchaseId: string,
  staff: {
    id: string;
    eventId: string;
    station?: string | null;
  }
) {
  return completeCheckIn(
    purchaseId,
    staff
  );
}

/*
|--------------------------------------------------------------------------
| Operations Dashboard
|--------------------------------------------------------------------------
*/

export async function dashboard(
  eventId: string
) {
  const [
    event,
    checkedIn,
    totalTickets,
    onlineStaff,
    recentActivity,
  ] = await Promise.all([

    prisma.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        title: true,
        venue: true,
        coverImage: true,
        capacity: true,
        currency: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    }),

    prisma.ticketPurchase.count({
      where: {
        eventId,
        checkedIn: true,
      },
    }),

    prisma.ticketPurchase.count({
      where: {
        eventId,
        status: "PAID",
      },
    }),

    prisma.operationSession.count({
      where: {
        isActive: true,
        staff: {
          eventId,
        },
      },
    }),

    prisma.eventActivity.findMany({
      where: {
        eventId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 20,
    }),
  ]);

  if (!event) {
    throw new Error(
      "Event not found."
    );
  }

  return {
    event,

    attendance: {
      checkedIn,

      totalTickets,

      remaining:
        Math.max(
          totalTickets -
            checkedIn,
          0
        ),

      capacity:
        event.capacity,
    },

    onlineStaff,

    recentActivity,
  };
}

/*
|--------------------------------------------------------------------------
| Undo Check In
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Undo Check In
|--------------------------------------------------------------------------
*/

export async function undoCheckIn(
  purchaseId: string,
  staff: {
    id: string;
    eventId: string;
  }
) {
  const purchase = await prisma.ticketPurchase.findUnique({
    where: {
      id: purchaseId,
    },
  });

  if (!purchase) {
    throw new Error("Purchase not found.");
  }

  if (purchase.eventId !== staff.eventId) {
    throw new Error("Invalid event.");
  }

  if (!purchase.checkedIn) {
    throw new Error("Attendee has not checked in.");
  }

  // Resolve the actual Attendee record.
  // EventActivity.attendeeId references Attendee.id, not User.id.
  const attendee = await prisma.attendee.findUnique({
    where: {
      eventId_userId: {
        eventId: purchase.eventId,
        userId: purchase.userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!attendee) {
    throw new Error(
      "Attendee registration not found for this event. Check-in reversal was not completed."
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
        purchaseId: purchase.id,
      },
    }),

    prisma.eventActivity.create({
      data: {
        eventId: purchase.eventId,
        actorId: staff.id,
        attendeeId: attendee.id,
        purchaseId: purchase.id,
        ticketTypeId: purchase.ticketTypeId,
        type: "UNDO_CHECK_IN",
        title: "Check In Reversed",
        description: "Attendee check-in was reversed.",
      },
    }),
  ]);

  return {
    success: true,
  };
}

/*
|--------------------------------------------------------------------------
| Search Attendee
|--------------------------------------------------------------------------
*/

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
      checkIn: true,
    },

    take: 20,
  });
}

