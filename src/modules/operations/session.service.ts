import { prisma } from "../../lib/prisma";

import { staffOffline } from "../../realtime";

export async function heartbeat(
  token: string
) {
  return prisma.operationSession.update({
    where: {
      token,
    },
    data: {
      lastSeenAt: new Date(),
    },
  });
}

export async function logout(
  token: string
) {
  const session =
    await prisma.operationSession.update({
      where: {
        token,
      },

      data: {
        isActive: false,
        endedAt: new Date(),
      },

      include: {
        staff: true,
      },
    });

  if (session.staff) {
    staffOffline({
      eventId:
        session.staff.eventId,

      id:
        session.staff.id,

      name:
        session.staff.name,

      role:
        session.staff.role,
    });
  }

  return session;
}

export async function onlineStaff(
  eventId: string
) {
  return prisma.operationSession.findMany({
    where: {
      isActive: true,

      staff: {
        eventId,
      },
    },

    include: {
      staff: true,
    },

    orderBy: {
      lastSeenAt: "desc",
    },
  });
}