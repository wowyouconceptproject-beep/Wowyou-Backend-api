"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentReturn = paymentReturn;
exports.subscriptionReturn = subscriptionReturn;
const prisma_1 = require("../../../lib/prisma");
/*
|--------------------------------------------------------------------------
| Attendee Payment Return
|--------------------------------------------------------------------------
|
| EXISTING FLOW
|
| Payment confirmation is handled exclusively by the Revolut webhook.
|
*/
async function paymentReturn(req, res) {
    try {
        const purchaseId = String(req.query.purchase ?? "").trim();
        if (!purchaseId) {
            return res.status(400).send("Missing purchase reference.");
        }
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
        | Return to WowYou Attendee App
        |--------------------------------------------------------------------------
        |
        | DO NOT mark the purchase as paid here.
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
/*
|--------------------------------------------------------------------------
| Organizer Subscription Return
|--------------------------------------------------------------------------
|
| This endpoint is ONLY a customer redirect.
|
| It does NOT:
|
| - activate a subscription
| - mark payment as successful
| - modify OrganizationSubscription
|
| The Revolut webhook remains authoritative.
|
*/
async function subscriptionReturn(req, res) {
    try {
        const platform = String(req.query.platform ??
            "web")
            .trim()
            .toLowerCase();
        /*
        |--------------------------------------------------------------------------
        | Mobile Organizer App
        |--------------------------------------------------------------------------
        */
        if (platform === "app") {
            return res.redirect(302, "wowyou://subscription-return");
        }
        /*
        |--------------------------------------------------------------------------
        | Web Organizer Platform
        |--------------------------------------------------------------------------
        */
        if (platform !== "web") {
            return res.status(400).send("Invalid subscription return platform.");
        }
        const frontendUrl = process.env.FRONTEND_URL;
        if (!frontendUrl) {
            console.error("FRONTEND_URL is not configured.");
            return res.status(500).send("Frontend URL is not configured.");
        }
        const url = new URL("/dashboard/billing", frontendUrl);
        url.searchParams.set("payment", "returned");
        return res.redirect(302, url.toString());
    }
    catch (error) {
        console.error("SUBSCRIPTION RETURN ERROR:", error);
        return res.status(500).send("Unable to process subscription return.");
    }
}
