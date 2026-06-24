"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicket = createTicket;
exports.getTickets = getTickets;
const prisma_1 = require("../../lib/prisma");
async function createTicket(eventId, data) {
    return prisma_1.prisma.ticketType.create({
        data: {
            eventId,
            name: data.name,
            price: Number(data.price),
            quantity: Number(data.quantity),
        },
    });
}
async function getTickets(eventId) {
    const event = await prisma_1.prisma.event.findUnique({
        where: {
            id: eventId,
        },
        include: {
            tickets: {
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
    if (!event) {
        throw new Error("Event not found");
    }
    return {
        currency: event.currency,
        tickets: event.tickets,
    };
}
