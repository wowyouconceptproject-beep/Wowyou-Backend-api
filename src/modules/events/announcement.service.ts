import { prisma } from "../../lib/prisma";

import {
  announcementCreated,
  announcementUpdated,
  announcementDeleted,
} from "../../realtime";

/*
|--------------------------------------------------------------------------
| List Announcements
|--------------------------------------------------------------------------
*/

export async function listAnnouncements(
  eventId: string,
  limit = 50
) {
  return prisma.announcement.findMany({
    where: {
      eventId,
    },

    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },

    orderBy: [
      {
        isPinned: "desc",
      },
      {
        createdAt: "desc",
      },
    ],

    take: limit,
  });
}

/*
|--------------------------------------------------------------------------
| Create Announcement
|--------------------------------------------------------------------------
*/

export async function createAnnouncement(
  eventId: string,
  staff: {
    id: string;
  },
  data: {
    title: string;
    message: string;
    type: string;
    priority: string;
    audience: string;
    isPinned?: boolean;
    expiresAt?: Date | null;
  }
) {
  const announcement =
    await prisma.announcement.create({
      data: {
        eventId,

        authorId: staff.id,

        title: data.title,

        message: data.message,

        type: data.type as any,

        priority:
          data.priority as any,

        audience:
          data.audience as any,

        isPinned:
          data.isPinned ?? false,

        expiresAt:
          data.expiresAt,
      },

      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  announcementCreated({
    id: announcement.id,

    eventId:
      announcement.eventId,

    title:
      announcement.title,

    message:
      announcement.message,

    type:
      announcement.type,

    priority:
      announcement.priority,

    audience:
      announcement.audience,

    isPinned:
      announcement.isPinned,

    authorId:
      announcement.authorId,

    authorName:
      announcement.author.name,

    createdAt:
      announcement.createdAt.toISOString(),
  });

  return announcement;
}

/*
|--------------------------------------------------------------------------
| Pin / Unpin Announcement
|--------------------------------------------------------------------------
*/

export async function pinAnnouncement(
  eventId: string,
  id: string,
  pinned: boolean
) {
  const announcement =
    await prisma.announcement.findUnique({
      where: {
        id,
      },
    });

  if (!announcement) {
    throw new Error(
      "Announcement not found."
    );
  }

  if (
    announcement.eventId !==
    eventId
  ) {
    throw new Error(
      "Invalid event."
    );
  }

  const updated =
    await prisma.announcement.update({
      where: {
        id,
      },

      data: {
        isPinned: pinned,
      },

      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  announcementUpdated({
    id: updated.id,

    eventId:
      updated.eventId,

    title:
      updated.title,

    message:
      updated.message,

    type:
      updated.type,

    priority:
      updated.priority,

    audience:
      updated.audience,

    isPinned:
      updated.isPinned,

    authorId:
      updated.authorId,

    authorName:
      updated.author.name,

    createdAt:
      updated.createdAt.toISOString(),
  });

  return updated;
}

/*
|--------------------------------------------------------------------------
| Delete Announcement
|--------------------------------------------------------------------------
*/

export async function deleteAnnouncement(
  eventId: string,
  id: string
) {
  const announcement =
    await prisma.announcement.findUnique({
      where: {
        id,
      },
    });

  if (!announcement) {
    throw new Error(
      "Announcement not found."
    );
  }

  if (
    announcement.eventId !==
    eventId
  ) {
    throw new Error(
      "Invalid event."
    );
  }

  await prisma.announcement.delete({
    where: {
      id,
    },
  });

  announcementDeleted(
    eventId,
    id,
  );

  return {
    success: true,
  };
}