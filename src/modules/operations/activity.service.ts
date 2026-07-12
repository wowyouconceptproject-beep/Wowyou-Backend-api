import { prisma } from "../../lib/prisma";

/*
|--------------------------------------------------------------------------
| List Activity
|--------------------------------------------------------------------------
*/

export async function listActivity(
  eventId: string,
  limit = 50
) {
  const activities =
    await prisma.eventActivity.findMany({
      where: {
        eventId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: limit,
    });

  return activities.map(
    (activity) => ({
      id: activity.id,

      type: activity.type,

      title: activity.title,

      description:
        activity.description,

      actorId:
        activity.actorId,

      attendeeId:
        activity.attendeeId,

      purchaseId:
        activity.purchaseId,

      ticketTypeId:
        activity.ticketTypeId,

      station:
        activity.station,

      createdAt:
        activity.createdAt,
    })
  );
}