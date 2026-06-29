import { prisma } from "../../lib/prisma";

export async function getAssignedEvents(
  userId: string
) {
  return prisma.eventStaff.findMany({
    where: {
      userId,
    },

    include: {
      event: {
        include: {
          tickets: true,

          _count: {
            select: {
              purchases: {
                where: {
                  checkedIn: true,
                },
              },
            },
          },
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}