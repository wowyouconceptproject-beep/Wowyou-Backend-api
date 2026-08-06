import { prisma } from "../../../lib/prisma";

export async function getCapacity(
  eventId: string,
) {
  const event =
    await prisma.event.findUnique({
      where: {
        id: eventId,
      },

      select: {
        id: true,

        title: true,

        capacity: true,

        currentOccupancy: true,

        totalCheckIns: true,

        totalCheckOuts: true,
      },
    });

  if (!event) {
    throw new Error(
      "Event not found.",
    );
  }

  return {
    ...event,

    occupancyPercentage:
      event.capacity === 0
        ? 0
        : Number(
            (
              (event.currentOccupancy /
                event.capacity) *
              100
            ).toFixed(2),
          ),
  };
}