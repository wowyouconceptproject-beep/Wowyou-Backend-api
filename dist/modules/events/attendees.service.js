"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventAttendees = getEventAttendees;
const prisma_1 = require("../../lib/prisma");
async function getEventAttendees(organizerId, eventId) {
    const event = await prisma_1.prisma.event.findUnique({
        where: {
            id: eventId,
        },
        include: {
            organization: true,
        },
    });
    if (!event) {
        throw new Error("Event not found.");
    }
    if (event.organization.ownerId !==
        organizerId) {
        throw new Error("Unauthorized.");
    }
    const purchases = await prisma_1.prisma.ticketPurchase.findMany({
        where: {
            eventId,
            status: "PAID",
        },
        include: {
            user: true,
            ticket: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    return purchases.map((purchase) => ({
        id: purchase.id,
        firstName: purchase.user.firstName,
        lastName: purchase.user.lastName,
        email: purchase.user.email,
        phone: purchase.user.phone,
        checkedIn: purchase.checkedIn,
        checkedInAt: purchase.checkedInAt,
        ticketType: purchase.ticket.name,
        purchaseId: purchase.id,
        userId: purchase.userId,
    }));
}
