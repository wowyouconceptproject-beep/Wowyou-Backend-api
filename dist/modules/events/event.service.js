"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
exports.getMyEvents = getMyEvents;
exports.getEventById = getEventById;
const prisma_1 = require("../../lib/prisma");
async function createEvent(userId, data) {
    console.log("CREATE EVENT DATA:", data);
    const organization = await prisma_1.prisma.organization.findUnique({
        where: {
            ownerId: userId,
        },
    });
    if (!organization) {
        throw new Error("Organization not found");
    }
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    console.log("PARSED DATES:", startDate, endDate);
    if (isNaN(startDate.getTime())) {
        throw new Error(`Invalid startDate: ${data.startDate}`);
    }
    if (isNaN(endDate.getTime())) {
        throw new Error(`Invalid endDate: ${data.endDate}`);
    }
    return prisma_1.prisma.event.create({
        data: {
            title: data.title,
            description: data.description,
            venue: data.venue,
            capacity: Number(data.capacity),
            startDate,
            endDate,
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
async function getEventById(userId, eventId) {
    const organization = await prisma_1.prisma.organization.findUnique({
        where: {
            ownerId: userId,
        },
    });
    if (!organization) {
        throw new Error("Organization not found");
    }
    const event = await prisma_1.prisma.event.findFirst({
        where: {
            id: eventId,
            organizationId: organization.id,
        },
    });
    if (!event) {
        throw new Error("Event not found");
    }
    return event;
}
