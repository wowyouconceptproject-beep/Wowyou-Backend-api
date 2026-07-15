"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAnnouncements = listAnnouncements;
exports.createAnnouncement = createAnnouncement;
exports.pinAnnouncement = pinAnnouncement;
exports.deleteAnnouncement = deleteAnnouncement;
const prisma_1 = require("../../lib/prisma");
const realtime_1 = require("../../realtime");
/*
|--------------------------------------------------------------------------
| List Announcements
|--------------------------------------------------------------------------
*/
async function listAnnouncements(eventId, limit = 50) {
    return prisma_1.prisma.announcement.findMany({
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
async function createAnnouncement(eventId, staff, data) {
    const announcement = await prisma_1.prisma.announcement.create({
        data: {
            eventId,
            authorId: staff.id,
            title: data.title,
            message: data.message,
            type: data.type,
            priority: data.priority,
            audience: data.audience,
            isPinned: data.isPinned ?? false,
            expiresAt: data.expiresAt,
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
    (0, realtime_1.announcementCreated)({
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
    return announcement;
}
/*
|--------------------------------------------------------------------------
| Pin / Unpin Announcement
|--------------------------------------------------------------------------
*/
async function pinAnnouncement(eventId, id, pinned) {
    const announcement = await prisma_1.prisma.announcement.findUnique({
        where: {
            id,
        },
    });
    if (!announcement) {
        throw new Error("Announcement not found.");
    }
    if (announcement.eventId !==
        eventId) {
        throw new Error("Invalid event.");
    }
    const updated = await prisma_1.prisma.announcement.update({
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
    (0, realtime_1.announcementUpdated)({
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
async function deleteAnnouncement(eventId, id) {
    const announcement = await prisma_1.prisma.announcement.findUnique({
        where: {
            id,
        },
    });
    if (!announcement) {
        throw new Error("Announcement not found.");
    }
    if (announcement.eventId !==
        eventId) {
        throw new Error("Invalid event.");
    }
    await prisma_1.prisma.announcement.delete({
        where: {
            id,
        },
    });
    (0, realtime_1.announcementDeleted)(eventId, id);
    return {
        success: true,
    };
}
