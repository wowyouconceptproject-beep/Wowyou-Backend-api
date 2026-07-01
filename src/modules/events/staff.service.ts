import { prisma } from "../../lib/prisma";

import {
  EventStaffRole,
  StaffPermission,
} from "@prisma/client";

import { generateAccessCode } from "./staff.utils";

import { defaultPermissions } from "./staff.permissions";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

async function getOwnedEvent(
  organizerId: string,
  eventId: string
) {
  const event =
    await prisma.event.findUnique({
      where: {
        id: eventId,
      },

      include: {
        organization: true,
      },
    });

  if (!event) {
    throw new Error(
      "Event not found."
    );
  }

  if (
    event.organization.ownerId !==
    organizerId
  ) {
    throw new Error(
      "Unauthorized."
    );
  }

  return event;
}

async function getOwnedStaff(
  organizerId: string,
  staffId: string
) {
  const staff =
    await prisma.eventStaff.findUnique({
      where: {
        id: staffId,
      },

      include: {
        event: {
          include: {
            organization: true,
          },
        },
      },
    });

  if (!staff) {
    throw new Error(
      "Staff not found."
    );
  }

  if (
    staff.event.organization.ownerId !==
    organizerId
  ) {
    throw new Error(
      "Unauthorized."
    );
  }

  return staff;
}

/*
|--------------------------------------------------------------------------
| Create Staff
|--------------------------------------------------------------------------
*/

export async function createStaff(
  organizerId: string,
  eventId: string,
  data: {
    name: string;
    phone?: string;
    email?: string;
    role: EventStaffRole;
    station?: string;
  }
) {
  await getOwnedEvent(
    organizerId,
    eventId
  );

  const accessCode =
    await generateAccessCode();

  const permissions =
    defaultPermissions(
      data.role
    ) as StaffPermission[];

  const staff =
    await prisma.eventStaff.create({
      data: {
        eventId,

        name: data.name,

        phone: data.phone,

        email: data.email,

        role: data.role,

        station:
          data.station,

        accessCode,

        permissions,

        invitedBy:
          organizerId,
      },
    });

  return {
    staff,
    accessCode,
  };
}

/*
|--------------------------------------------------------------------------
| List Staff
|--------------------------------------------------------------------------
*/

export async function listStaff(
  organizerId: string,
  eventId: string
) {
  await getOwnedEvent(
    organizerId,
    eventId
  );

  return prisma.eventStaff.findMany({
    where: {
      eventId,
    },

    orderBy: {
      createdAt: "asc",
    },
  });
}

/*
|--------------------------------------------------------------------------
| Get Staff
|--------------------------------------------------------------------------
*/

export async function getStaff(
  organizerId: string,
  staffId: string
) {
  return getOwnedStaff(
    organizerId,
    staffId
  );
}

/*
|--------------------------------------------------------------------------
| Regenerate Access Code
|--------------------------------------------------------------------------
*/

export async function regenerateAccessCode(
  organizerId: string,
  staffId: string
) {
  const staff =
    await getOwnedStaff(
      organizerId,
      staffId
    );

  const accessCode =
    await generateAccessCode();

  const updated =
    await prisma.eventStaff.update({
      where: {
        id: staff.id,
      },

      data: {
        accessCode,

        lastUsedAt: null,
      },
    });

  return {
    staff: updated,
    accessCode,
  };
}

/*
|--------------------------------------------------------------------------
| Disable Staff
|--------------------------------------------------------------------------
*/

export async function disableStaff(
  organizerId: string,
  staffId: string
) {
  const staff =
    await getOwnedStaff(
      organizerId,
      staffId
    );

  await prisma.$transaction([
    prisma.eventStaff.update({
      where: {
        id: staff.id,
      },

      data: {
        isActive: false,
        isRevoked: true,
      },
    }),

    prisma.operationSession.updateMany({
      where: {
        staffId: staff.id,
        isActive: true,
      },

      data: {
        isActive: false,
        endedAt: new Date(),
      },
    }),
  ]);

  return {
    success: true,
  };
}

/*
|--------------------------------------------------------------------------
| Verify Access Code
|--------------------------------------------------------------------------
*/

export async function verifyAccessCode(
  accessCode: string
) {
  const staff =
    await prisma.eventStaff.findUnique({
      where: {
        accessCode,
      },

      include: {
        event: {
          select: {
            id: true,
            title: true,
            venue: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
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
      "Event is not available."
    );
  }

  await prisma.eventStaff.update({
    where: {
      id: staff.id,
    },

    data: {
      lastUsedAt: new Date(),
    },
  });

  return staff;
}