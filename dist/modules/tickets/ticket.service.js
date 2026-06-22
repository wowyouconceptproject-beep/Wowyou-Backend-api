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
    return prisma_1.prisma.ticketType.findMany({
        where: {
            eventId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
