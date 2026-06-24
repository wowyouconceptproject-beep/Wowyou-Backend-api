"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventRevenue = getEventRevenue;
const prisma_1 = require("../../lib/prisma");
async function getEventRevenue(eventId) {
    const purchases = await prisma_1.prisma.ticketPurchase.findMany({
        where: {
            eventId,
            status: "PAID",
        },
        include: {
            ticket: true,
        },
    });
    let totalRevenue = 0;
    let ticketsSold = 0;
    const breakdown = {};
    for (const purchase of purchases) {
        totalRevenue += purchase.amount;
        ticketsSold += purchase.quantity;
        const ticketName = purchase.ticket.name;
        if (!breakdown[ticketName]) {
            breakdown[ticketName] = {
                name: ticketName,
                sold: 0,
                revenue: 0,
            };
        }
        breakdown[ticketName].sold +=
            purchase.quantity;
        breakdown[ticketName].revenue +=
            purchase.amount;
    }
    return {
        totalRevenue,
        ticketsSold,
        breakdown: Object.values(breakdown),
    };
}
