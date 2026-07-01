import { prisma } from "../../lib/prisma";

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
  return prisma.operationSession.update({
    where: {
      token,
    },
    data: {
      isActive: false,
      endedAt: new Date(),
    },
  });
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