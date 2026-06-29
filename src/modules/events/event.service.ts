import { prisma } from "../../lib/prisma";

export async function createEvent(
  userId: string,
  data: {
    title: string;
    description: string;
    venue: string;
    capacity: number;
    currency?: string;
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

  const startDate =
    new Date(data.startDate);

  const endDate =
    new Date(data.endDate);

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

  return prisma.$transaction(
    async (tx) => {
      const event =
        await tx.event.create({
          data: {
            title: data.title,
            description:
              data.description,
            venue: data.venue,
            capacity: Number(
              data.capacity
            ),
            currency:
              data.currency ??
              "USD",
            startDate,
            endDate,
            organizationId:
              organization.id,
          },
        });

      await tx.eventStaff.create({
        data: {
          eventId: event.id,
          userId,
          role: "OWNER",
        },
      });

      return event;
    }
  );
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

export async function getEventById(
  userId: string,
  eventId: string
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

  const event =
    await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId:
          organization.id,
      },
      include: {
        tickets: true,
      },
    });

  if (!event) {
    throw new Error(
      "Event not found"
    );
  }

  return event;
}

export async function publishEvent(
  userId: string,
  eventId: string
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

  return prisma.event.update({
    where: {
      id: eventId,
    },
    data: {
      status: "PUBLISHED",
    },
  });
}

export async function getPublicEvents() {
  return prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      isPublic: true,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        },
      },
      tickets: true,
    },
    orderBy: {
      startDate: "asc",
    },
  });
}

export async function registerForEvent(
  userId: string,
  eventId: string
) {
  const event =
    await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    });

  if (!event) {
    throw new Error(
      "Event not found"
    );
  }

  const existing =
    await prisma.registration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

  if (existing) {
    throw new Error(
      "Already registered"
    );
  }

  return prisma.registration.create({
    data: {
      userId,
      eventId,
    },
  });
}

export async function getMyRegistrations(
  userId: string
) {
  const registrations =
    await prisma.registration.findMany({
      where: {
        userId,
      },
      include: {
        event: {
          include: {
            organization: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  return registrations.map(
    (registration) =>
      registration.event
  );
}