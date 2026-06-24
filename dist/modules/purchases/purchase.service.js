"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPurchase = createPurchase;
const stripe_1 = __importDefault(require("stripe"));
const prisma_1 = require("../../lib/prisma");
function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error("STRIPE_SECRET_KEY is missing");
    }
    return new stripe_1.default(key);
}
async function createPurchase(userId, ticketTypeId, quantity) {
    if (quantity < 1) {
        throw new Error("Quantity must be at least 1");
    }
    const ticket = await prisma_1.prisma.ticketType.findUnique({
        where: {
            id: ticketTypeId,
        },
        include: {
            event: true,
        },
    });
    if (!ticket) {
        throw new Error("Ticket not found");
    }
    if (!ticket.isActive) {
        throw new Error("Ticket unavailable");
    }
    const amount = ticket.price * quantity;
    const purchase = await prisma_1.prisma.ticketPurchase.create({
        data: {
            userId,
            eventId: ticket.eventId,
            ticketTypeId,
            quantity,
            amount,
            status: "PENDING",
        },
    });
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${process.env.FRONTEND_URL}/tickets/success?purchase=${purchase.id}`,
        cancel_url: `${process.env.FRONTEND_URL}/tickets/cancel?purchase=${purchase.id}`,
        metadata: {
            purchaseId: purchase.id,
            userId,
            eventId: ticket.eventId,
            ticketTypeId,
        },
        line_items: [
            {
                quantity,
                price_data: {
                    currency: ticket.event.currency
                        .toLowerCase(),
                    product_data: {
                        name: ticket.name,
                        description: ticket.event.title,
                    },
                    unit_amount: Math.round(ticket.price * 100),
                },
            },
        ],
    });
    await prisma_1.prisma.ticketPurchase.update({
        where: {
            id: purchase.id,
        },
        data: {
            stripeSessionId: session.id,
        },
    });
    return {
        purchase,
        checkoutUrl: session.url,
    };
}
