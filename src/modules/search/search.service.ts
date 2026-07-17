import { prisma } from "../../lib/prisma";

export async function searchEvents(
  q: string,
  limit = 20,
) {
  return prisma.event.findMany({
    where: {
      status: "PUBLISHED",

      OR: [
        {
          title: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          venue: {
            contains: q,
            mode: "insensitive",
          },
        },
      ],
    },

    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },

      _count: {
        select: {
          attendees: true,
        },
      },
    },

    orderBy: {
      startDate: "asc",
    },

    take: limit,
  });
}

export async function searchOrganizations(
  q: string,
  limit = 10,
) {
  return prisma.organization.findMany({
    where: {
      name: {
        contains: q,
        mode: "insensitive",
      },
    },

    select: {
      id: true,
      name: true,
      logo: true,
      website: true,
    },

    take: limit,
  });
}

export async function globalSearch(
  q: string,
  limit = 20,
) {
  const [events, organizations] =
    await Promise.all([
      searchEvents(q, limit),
      searchOrganizations(q, limit),
    ]);

  return {
    success: true,
    events,
    organizations,
  };
}

export async function searchSuggestions(
  q: string,
) {
  const events =
      await prisma.event.findMany({
    where: {
      status: "PUBLISHED",

      title: {
        contains: q,
        mode: "insensitive",
      },
    },

    select: {
      id: true,
      title: true,
    },

    take: 10,
  });

  const organizations =
      await prisma.organization.findMany({
    where: {
      name: {
        contains: q,
        mode: "insensitive",
      },
    },

    select: {
      id: true,
      name: true,
    },

    take: 5,
  });

  return {
    success: true,

    suggestions: [
      ...events.map((e) => ({
        id: e.id,
        title: e.title,
        type: "event",
      })),

      ...organizations.map((o) => ({
        id: o.id,
        title: o.name,
        type: "organization",
      })),
    ],
  };
}