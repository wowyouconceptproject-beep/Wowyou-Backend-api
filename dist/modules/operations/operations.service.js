"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssignedEvents = getAssignedEvents;
const prisma_1 = require("../../lib/prisma");
async function getAssignedEvents(userId) {
    return prisma_1.prisma.eventStaff.findMany({
        where: {
            userId,
        },
        include: {
            event: {
                include: {
                    tickets: true,
                    _count: {
                        select: {
                            purchases: {
                                where: {
                                    checkedIn: true,
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
