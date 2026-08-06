"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCapacity = getCapacity;
const prisma_1 = require("../../../lib/prisma");
async function getCapacity(eventId) {
    const event = await prisma_1.prisma.event.findUnique({
        where: {
            id: eventId,
        },
        select: {
            id: true,
            title: true,
            capacity: true,
            currentOccupancy: true,
            totalCheckIns: true,
            totalCheckOuts: true,
        },
    });
    if (!event) {
        throw new Error("Event not found.");
    }
    return {
        ...event,
        occupancyPercentage: event.capacity === 0
            ? 0
            : Number(((event.currentOccupancy /
                event.capacity) *
                100).toFixed(2)),
    };
}
