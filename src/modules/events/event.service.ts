import { prisma } from "../../lib/prisma";

export async function createEvent(
  userId: string,
  data: {
    title: string;
    description: string;
    venue: string;
    capacity: number;
    startDate: string;
    endDate: string;
  }
) {
  console.log(
    "CREATE EVENT DATA:",
    data
  );

  const organization =
    await prisma.organization.findUnique({
      where: {
        ownerId: userId,
      },
    });

  if (!organization) {
    throw new Error(
      "Organization not found"
    );
  }

  const startDate =
    new Date(data.startDate);

  const endDate =
    new Date(data.endDate);

  console.log(
    "PARSED DATES:",
    startDate,
    endDate
  );

  if (
    isNaN(startDate.getTime())
  ) {
    throw new Error(
      `Invalid startDate: ${data.startDate}`
    );
  }

  if (
    isNaN(endDate.getTime())
  ) {
    throw new Error(
      `Invalid endDate: ${data.endDate}`
    );
  }

  return prisma.event.create({
    data: {
      title: data.title,
      description:
        data.description,
      venue: data.venue,
      capacity: Number(
        data.capacity
      ),
      startDate,
      endDate,
      organizationId:
        organization.id,
    },
  });
}

export async function getMyEvents(
  userId: string
) {
  const organization =
    await prisma.organization.findUnique({
      where: {
        ownerId: userId,
      },
    });

  if (!organization) {
    return [];
  }

  return prisma.event.findMany({
    where: {
      organizationId:
        organization.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}