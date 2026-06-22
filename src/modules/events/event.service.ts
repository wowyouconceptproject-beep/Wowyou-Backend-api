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

  return prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      venue: data.venue,
      capacity: Number(
        data.capacity
      ),
      startDate: new Date(
        data.startDate
      ),
      endDate: new Date(
        data.endDate
      ),
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