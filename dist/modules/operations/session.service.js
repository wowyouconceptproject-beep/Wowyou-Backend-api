"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.heartbeat = heartbeat;
exports.logout = logout;
exports.onlineStaff = onlineStaff;
const prisma_1 = require("../../lib/prisma");
const realtime_1 = require("../../realtime");
async function heartbeat(token) {
    return prisma_1.prisma.operationSession.update({
        where: {
            token,
        },
        data: {
            lastSeenAt: new Date(),
        },
    });
}
async function logout(token) {
    const session = await prisma_1.prisma.operationSession.update({
        where: {
            token,
        },
        data: {
            isActive: false,
            endedAt: new Date(),
        },
        include: {
            staff: true,
        },
    });
    if (session.staff) {
        (0, realtime_1.staffOffline)({
            eventId: session.staff.eventId,
            id: session.staff.id,
            name: session.staff.name,
            role: session.staff.role,
        });
    }
    return session;
}
async function onlineStaff(eventId) {
    return prisma_1.prisma.operationSession.findMany({
        where: {
            isActive: true,
            staff: {
                eventId,
            },
        },
        include: {
            staff: true,
        },
        orderBy: {
            lastSeenAt: "desc",
        },
    });
}
