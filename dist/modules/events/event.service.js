"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
exports.getMyEvents = getMyEvents;
exports.getEventById = getEventById;
exports.publishEvent = publishEvent;
exports.getPublicEvents = getPublicEvents;
exports.registerForEvent = registerForEvent;
exports.getMyRegistrations = getMyRegistrations;
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
async function publishEvent(userId, eventId) {
    const organization = await prisma_1.prisma.organization.findUnique({
        where: {
            ownerId: userId,
        },
    });
    if (!organization) {
        throw new Error("Organization not found");
    }
    return prisma_1.prisma.event.update({
        where: {
            id: eventId,
        },
        data: {
            status: "PUBLISHED",
        },
    });
}
async function getPublicEvents() {
    return prisma_1.prisma.event.findMany({
        where: {
            status: "PUBLISHED",
        },
        orderBy: {
            startDate: "asc",
        },
        include: {
            organization: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            },
        },
    });
}
async function registerForEvent(userId, eventId) {
    const event = await prisma_1.prisma.event.findUnique({
        where: {
            id: eventId,
        },
    });
    if (!event) {
        throw new Error("Event not found");
    }
    const existing = await prisma_1.prisma.registration.findUnique({
        where: {
            userId_eventId: {
                userId,
                eventId,
            },
        },
    });
    if (existing) {
        throw new Error("Already registered");
    }
    return prisma_1.prisma.registration.create({
        data: {
            userId,
            eventId,
        },
    });
}
async function getMyRegistrations(userId) {
    const registrations = await prisma_1.prisma.registration.findMany({
        where: {
            userId,
        },
        include: {
            event: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    return registrations.map((registration) => registration.event);
}
