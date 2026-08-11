"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentReturn = paymentReturn;
const prisma_1 = require("../../../lib/prisma");
async function paymentReturn(req, res) {
    try {
        /*
        |--------------------------------------------------------------------------
        | Purchase Reference
        |--------------------------------------------------------------------------
        */
        const purchaseId = String(req.query.purchase ?? "").trim();
        if (!purchaseId) {
            return res.status(400).send("Missing purchase reference.");
        }
        /*
        |--------------------------------------------------------------------------
        | Verify Purchase Exists
        |--------------------------------------------------------------------------
        */
        const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
            where: {
                id: purchaseId,
            },
            select: {
                id: true,
            },
        });
        if (!purchase) {
            return res.status(404).send("Purchase not found.");
        }
        /*
        |--------------------------------------------------------------------------
        | Return to WoWYou Attendee App
        |--------------------------------------------------------------------------
        |
        | This redirect does NOT mark the purchase as paid.
        |
        | Payment confirmation is handled exclusively by the
        | Revolut webhook.
        |
        */
        const deepLink = `wowyou://payment-return?purchase=${encodeURIComponent(purchase.id)}`;
        return res.redirect(302, deepLink);
    }
    catch (error) {
        console.error("PAYMENT RETURN ERROR:", error);
        return res.status(500).send("Unable to process payment return.");
    }
}
