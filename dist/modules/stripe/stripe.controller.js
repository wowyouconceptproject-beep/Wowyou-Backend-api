"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhook = webhook;
const stripe_1 = __importDefault(require("stripe"));
const prisma_1 = require("../../lib/prisma");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
async function webhook(req, res) {
    const signature = req.headers["stripe-signature"];
    try {
        const event = stripe.webhooks.constructEvent(req.body, signature, process.env
            .STRIPE_WEBHOOK_SECRET);
        if (event.type ===
            "checkout.session.completed") {
            const session = event.data.object;
            const purchaseId = session.metadata
                ?.purchaseId;
            if (purchaseId) {
                const purchase = await prisma_1.prisma.ticketPurchase.update({
                    where: {
                        id: purchaseId,
                    },
                    data: {
                        status: "PAID",
                    },
                });
                await prisma_1.prisma.ticketType.update({
                    where: {
                        id: purchase.ticketTypeId,
                    },
                    data: {
                        sold: {
                            increment: purchase.quantity,
                        },
                    },
                });
            }
        }
        return res.json({
            received: true,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(400).send("Webhook Error");
    }
}
