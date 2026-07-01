"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.heartbeat = heartbeat;
exports.logout = logout;
exports.onlineStaff = onlineStaff;
const prisma_1 = require("../../lib/prisma");
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
    return prisma_1.prisma.operationSession.update({
        where: {
            token,
        },
        data: {
            isActive: false,
            endedAt: new Date(),
        },
    });
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
