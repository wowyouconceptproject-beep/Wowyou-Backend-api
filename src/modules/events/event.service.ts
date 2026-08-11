import {
  EventCategory,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";

export async function createEvent(
  userId: string,
  data: {
    title: string;
    description: string;

    venue: string;
    venueAddress?: string;
    venueLatitude?: number;
    venueLongitude?: number;
    city?: string;
    country?: string;

    coverImage?: string;
    category?: EventCategory;

    capacity: number;
    currency?: string;

    startDate: string;
    endDate: string;

    isPublic?: boolean;
  },
) {
  const organization =
    await prisma.organization.findUnique({
      where: {
        ownerId: userId,
      },
    });

  if (!organization) {
    throw new Error(
      "Organization not found",
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
      `Invalid startDate: ${data.startDate}`,
    );
  }

  if (
    isNaN(endDate.getTime())
  ) {
    throw new Error(
      `Invalid endDate: ${data.endDate}`,
    );
  }

  if (
    endDate <= startDate
  ) {
    throw new Error(
      "End date must be after start date",
    );
  }

  if (
    data.venueLatitude !== undefined &&
    (
      data.venueLatitude < -90 ||
      data.venueLatitude > 90
    )
  ) {
    throw new Error(
      "Invalid venue latitude.",
    );
  }

  if (
    data.venueLongitude !== undefined &&
    (
      data.venueLongitude < -180 ||
      data.venueLongitude > 180
    )
  ) {
    throw new Error(
      "Invalid venue longitude.",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const event =
        await tx.event.create({
          data: {
            title:
              data.title,

            description:
              data.description,

            venue:
              data.venue,

            venueAddress:
              data.venueAddress,

            venueLatitude:
              data.venueLatitude,

            venueLongitude:
              data.venueLongitude,

            city:
              data.city,

            country:
              data.country,

            coverImage:
              data.coverImage,

            category:
              data.category,

            capacity:
              Number(
                data.capacity,
              ),

            currency:
              data.currency ??
              "USD",

            startDate,

            endDate,

            isPublic:
              data.isPublic ??
              true,

            organizationId:
              organization.id,
          },
        });

      return event;
    },
  );
}

export async function getMyEvents(
  userId: string,
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
  eventId: string,
) {
  const organization =
    await prisma.organization.findUnique({
      where: {
        ownerId: userId,
      },
    });

  if (!organization) {
    throw new Error(
      "Organization not found",
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
      "Event not found",
    );
  }

  return event;
}

export async function publishEvent(
  userId: string,
  eventId: string,
) {
  const organization =
    await prisma.organization.findUnique({
      where: {
        ownerId: userId,
      },
    });

  if (!organization) {
    throw new Error(
      "Organization not found",
    );
  }

  const event =
    await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId:
          organization.id,
      },
    });

  if (!event) {
    throw new Error(
      "Event not found",
    );
  }

  return prisma.event.update({
    where: {
      id: event.id,
    },
    data: {
      status:
        "PUBLISHED",
    },
  });
}

export async function getPublicEvents() {
  const events =
    await prisma.event.findMany({
      where: {
        status:
          "PUBLISHED",

        isPublic:
          true,

        endDate: {
          gt: new Date(),
        },
      },

      include: {
        tickets: {
          where: {
            isActive: true,
          },

          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            price: true,
            quantity: true,
            sold: true,
            isActive: true,
          },

          orderBy: {
            price: "asc",
          },
        },
      },

      orderBy: {
        startDate: "asc",
      },
    });

  return events;
}

export async function getPublicEventById(
  eventId: string,
) {
  const event =
    await prisma.event.findFirst({
      where: {
        id: eventId,

        status:
          "PUBLISHED",

        isPublic:
          true,
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

        tickets: {
          where: {
            isActive: true,
          },

          orderBy: {
            price: "asc",
          },
        },
      },
    });

  if (!event) {
    throw new Error(
      "Event not found",
    );
  }

  return event;
}

export async function registerForEvent(
  userId: string,
  eventId: string,
) {
  const event =
    await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    });

  if (!event) {
    throw new Error(
      "Event not found",
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
      "Already registered",
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
  userId: string,
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
      registration.event,
  );
}