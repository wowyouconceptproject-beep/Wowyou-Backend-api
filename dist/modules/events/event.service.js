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
    if (isNaN(startDate.getTime())) {
        throw new Error(`Invalid startDate: ${data.startDate}`);
    }
    if (isNaN(endDate.getTime())) {
        throw new Error(`Invalid endDate: ${data.endDate}`);
    }
    return prisma_1.prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
            data: {
                title: data.title,
                description: data.description,
                venue: data.venue,
                capacity: Number(data.capacity),
                currency: data.currency ??
                    "USD",
                startDate,
                endDate,
                organizationId: organization.id,
            },
        });
        await tx.eventStaff.create({
            data: {
                eventId: event.id,
                userId,
                role: "OWNER",
            },
        });
        return event;
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
        include: {
            tickets: true,
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
            isPublic: true,
        },
        include: {
            organization: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logo: true,
                },
            },
            tickets: true,
        },
        orderBy: {
            startDate: "asc",
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
            event: {
                include: {
                    organization: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    return registrations.map((registration) => registration.event);
}
