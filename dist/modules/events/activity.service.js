"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listActivity = listActivity;
const prisma_1 = require("../../lib/prisma");
/*
|--------------------------------------------------------------------------
| List Activity
|--------------------------------------------------------------------------
*/
async function listActivity(eventId, limit = 50) {
    const activities = await prisma_1.prisma.eventActivity.findMany({
        where: {
            eventId,
        },
        include: {
            purchase: {
                select: {
                    id: true,
                },
            },
            ticketType: {
                select: {
                    id: true,
                    name: true,
                },
            },
            actor: {
                select: {
                    id: true,
                    name: true,
                    role: true,
                },
            },
            attendee: {
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        take: limit,
    });
    return activities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        actorId: activity.actorId,
        actorName: activity.actor?.name ?? null,
        actorRole: activity.actor?.role ?? null,
        attendeeId: activity.attendeeId,
        attendeeName: activity.attendee
            ? `${activity.attendee.user.firstName} ${activity.attendee.user.lastName}`
            : null,
        purchaseId: activity.purchaseId,
        ticketTypeId: activity.ticketTypeId,
        ticketTypeName: activity.ticketType?.name ?? null,
        station: activity.station,
        createdAt: activity.createdAt,
    }));
}
