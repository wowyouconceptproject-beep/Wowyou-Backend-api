import { prisma } from "../../lib/prisma";

import {
  announcementCreated,
  announcementUpdated,
  announcementDeleted,
} from "../../realtime";

import { sendPushNotification } from "../notifications/firebase-admin";

type AnnouncementInput = {
  title: string;
  message: string;
  type: string;
  priority: string;
  audience: string;
  isPinned?: boolean;
  expiresAt?: Date | null;
};

/**
 * Get the user IDs eligible to receive this announcement.
 *
 * ATTENDEES: registered event attendees.
 * ALL: registered event attendees.
 *
 * EventStaff currently has no userId relation in the Prisma
 * schema, so STAFF and ORGANIZERS require a separate recipient
 * mapping before they can receive targeted push notifications.
 */
async function getAnnouncementRecipientIds(
  eventId: string,
  audience: string,
): Promise<string[]> {
  if (audience !== "ALL" && audience !== "ATTENDEES") {
    console.warn(
      `[Announcements] Push recipient mapping is not configured for audience "${audience}".`,
    );

    return [];
  }

  const attendees = await prisma.attendee.findMany({
    where: {
      eventId,
      status: {
        not: "CANCELLED",
      },
    },
    select: {
      userId: true,
    },
  });

  const registrations = await prisma.registration.findMany({
    where: {
      eventId,
    },
    select: {
      userId: true,
    },
  });

  return [
    ...new Set([
      ...attendees.map((attendee) => attendee.userId),
      ...registrations.map((registration) => registration.userId),
    ]),
  ];
}

/**
 * Persist in-app notifications and deliver FCM push notifications.
 *
 * Notification delivery must not undo an announcement that has
 * already been saved successfully.
 */
async function deliverAnnouncementNotifications(input: {
  eventId: string;
  announcementId: string;
  title: string;
  message: string;
  audience: string;
}) {
  try {
    const userIds = await getAnnouncementRecipientIds(
      input.eventId,
      input.audience,
    );

    if (userIds.length === 0) {
      console.info(
        `[Announcements] No mapped recipients for announcement ${input.announcementId}.`,
      );
      return;
    }

    // Respect each user's push-notification preference.
    const eligibleUsers = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
        settings: {
  is: {
    pushNotifications: true,
  },
},
      },
      select: {
        id: true,
      },
    });

    const eligibleUserIds = eligibleUsers.map((user) => user.id);

    if (eligibleUserIds.length === 0) {
      console.info(
        `[Announcements] No recipients have push notifications enabled for ${input.announcementId}.`,
      );
      return;
    }

    // Save notifications for the user's in-app notification centre.
    await prisma.notification.createMany({
      data: eligibleUserIds.map((userId) => ({
        userId,
        title: input.title,
        body: input.message,
      })),
    });

    // Fetch registered device tokens belonging to eligible users.
    const devices = await prisma.deviceToken.findMany({
      where: {
        userId: {
          in: eligibleUserIds,
        },
      },
      select: {
        id: true,
        token: true,
      },
    });

    if (devices.length === 0) {
      console.info(
        `[Announcements] No device tokens registered for ${input.announcementId}. In-app notifications were saved.`,
      );
      return;
    }

    const result = await sendPushNotification({
      tokens: devices.map((device) => device.token),
      title: input.title,
      body: input.message,
      data: {
        type: "ANNOUNCEMENT",
        eventId: input.eventId,
        announcementId: input.announcementId,
      },
    });

    // Remove expired or invalid FCM registration tokens.
    if (result.invalidTokens.length > 0) {
      await prisma.deviceToken.deleteMany({
        where: {
          token: {
            in: result.invalidTokens,
          },
        },
      });
    }

    console.info("[Announcements] Push delivery completed.", {
      announcementId: input.announcementId,
      recipients: eligibleUserIds.length,
      devices: devices.length,
      delivered: result.successCount,
      failed: result.failureCount,
      invalidTokensRemoved: result.invalidTokens.length,
    });
  } catch (error) {
    // Do not fail announcement creation because push delivery failed.
    console.error(
      `[Announcements] Notification delivery failed for ${input.announcementId}:`,
      error,
    );
  }
}

/*
|--------------------------------------------------------------------------
| List Announcements
|--------------------------------------------------------------------------
*/

export async function listAnnouncements(
  eventId: string,
  limit = 50,
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
  data: AnnouncementInput,
) {
  const announcement = await prisma.announcement.create({
    data: {
      eventId,
      authorId: staff.id,
      title: data.title,
      message: data.message,
      type: data.type as any,
      priority: data.priority as any,
      audience: data.audience as any,
      isPinned: data.isPinned ?? false,
      expiresAt: data.expiresAt ?? null,
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

  // Keep existing realtime behaviour for connected clients.
  announcementCreated({
    id: announcement.id,
    eventId: announcement.eventId,
    title: announcement.title,
    message: announcement.message,
    type: announcement.type,
    priority: announcement.priority,
    audience: announcement.audience,
    isPinned: announcement.isPinned,
    authorId: announcement.authorId,
    authorName: announcement.author.name,
    createdAt: announcement.createdAt.toISOString(),
  });

  // Deliver push and in-app notifications without blocking success
  // if Firebase is temporarily unavailable.
  void deliverAnnouncementNotifications({
    eventId: announcement.eventId,
    announcementId: announcement.id,
    title: announcement.title,
    message: announcement.message,
    audience: announcement.audience,
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
  pinned: boolean,
) {
  const announcement = await prisma.announcement.findUnique({
    where: {
      id,
    },
  });

  if (!announcement) {
    throw new Error("Announcement not found.");
  }

  if (announcement.eventId !== eventId) {
    throw new Error("Invalid event.");
  }

  const updated = await prisma.announcement.update({
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
    eventId: updated.eventId,
    title: updated.title,
    message: updated.message,
    type: updated.type,
    priority: updated.priority,
    audience: updated.audience,
    isPinned: updated.isPinned,
    authorId: updated.authorId,
    authorName: updated.author.name,
    createdAt: updated.createdAt.toISOString(),
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
  id: string,
) {
  const announcement = await prisma.announcement.findUnique({
    where: {
      id,
    },
  });

  if (!announcement) {
    throw new Error("Announcement not found.");
  }

  if (announcement.eventId !== eventId) {
    throw new Error("Invalid event.");
  }

  await prisma.announcement.delete({
    where: {
      id,
    },
  });

  announcementDeleted(eventId, id);

  return {
    success: true,
  };
}