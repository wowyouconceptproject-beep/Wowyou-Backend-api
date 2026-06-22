"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
exports.getMyEvents = getMyEvents;
const prisma_1 = require("../../lib/prisma");
async function createEvent(userId, data) {
    const organization = await prisma_1.prisma.organization.findUnique({
        where: {
            ownerId: userId,
        },
    });
    if (!organization) {
        throw new Error("Organization not found");
    }
    return prisma_1.prisma.event.create({
        data: {
            title: data.title,
            description: data.description,
            venue: data.venue,
            capacity: Number(data.capacity),
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            organizationId: organization.id,
        },
    });
}
async function getMyEvents(userId) {
    const organization = await prisma_1.prisma.organization.findUnique({
        where: {
            ownerId: userId,
        },
    });
    if (!organization) {
        return [];
    }
    return prisma_1.prisma.event.findMany({
        where: {
            organizationId: organization.id,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
