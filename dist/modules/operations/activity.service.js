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
        attendeeId: activity.attendeeId,
        purchaseId: activity.purchaseId,
        ticketTypeId: activity.ticketTypeId,
        station: activity.station,
        createdAt: activity.createdAt,
    }));
}
