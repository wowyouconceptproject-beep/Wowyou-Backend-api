"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.paymentStatus = paymentStatus;
exports.myTickets = myTickets;
exports.myEvents = myEvents;
exports.getMyEvent = getMyEvent;
const purchase_service_1 = require("./purchase.service");
/*
|--------------------------------------------------------------------------
| Create Purchase
|--------------------------------------------------------------------------
*/
async function create(req, res) {
    try {
        const userId = req.user?.userId;
        const ticketTypeId = String(req.body.ticketTypeId ?? "").trim();
        const quantity = Number(req.body.quantity);
        /*
        |--------------------------------------------------------------------------
        | Authentication
        |--------------------------------------------------------------------------
        */
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Ticket Type
        |--------------------------------------------------------------------------
        */
        if (!ticketTypeId) {
            return res.status(400).json({
                success: false,
                message: "Ticket type is required.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Quantity
        |--------------------------------------------------------------------------
        */
        if (!Number.isInteger(quantity) ||
            quantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be at least 1.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Create Purchase
        |--------------------------------------------------------------------------
        */
        const result = await (0, purchase_service_1.createPurchase)(userId, ticketTypeId, quantity);
        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        |
        | Paid ticket:
        |
        | paymentRequired = true
        | checkoutUrl      = Revolut checkout URL
        |
        | Free ticket:
        |
        | paymentRequired = false
        | checkoutUrl      = null
        |
        */
        return res.status(201).json({
            success: true,
            paymentRequired: result.paymentRequired,
            checkoutUrl: result.checkoutUrl ?? null,
            purchase: result.purchase,
        });
    }
    catch (error) {
        console.error("CREATE PURCHASE ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error?.message ??
                "Unable to create purchase.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Payment Status
|--------------------------------------------------------------------------
*/
async function paymentStatus(req, res) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        const purchaseId = Array.isArray(req.params.purchaseId)
            ? req.params.purchaseId[0]
            : req.params.purchaseId;
        if (!purchaseId) {
            return res.status(400).json({
                success: false,
                message: "Purchase ID is required.",
            });
        }
        const purchase = await (0, purchase_service_1.getPurchasePaymentStatus)(userId, purchaseId);
        return res.status(200).json({
            success: true,
            purchase,
        });
    }
    catch (error) {
        console.error("PAYMENT STATUS ERROR:", error);
        if (error?.message ===
            "Purchase not found.") {
            return res.status(404).json({
                success: false,
                message: "Purchase not found.",
            });
        }
        return res.status(400).json({
            success: false,
            message: error?.message ??
                "Unable to load payment status.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| My Tickets
|--------------------------------------------------------------------------
*/
async function myTickets(req, res) {
    try {
        const userId = req.user?.userId;
        /*
        |--------------------------------------------------------------------------
        | Authentication
        |--------------------------------------------------------------------------
        */
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Paid Tickets
        |--------------------------------------------------------------------------
        */
        const tickets = await (0, purchase_service_1.getMyTickets)(userId);
        return res.status(200).json({
            success: true,
            tickets,
        });
    }
    catch (error) {
        console.error("MY TICKETS ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error?.message ??
                "Unable to load tickets.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| My Events
|--------------------------------------------------------------------------
*/
async function myEvents(req, res) {
    try {
        const userId = req.user?.userId;
        /*
        |--------------------------------------------------------------------------
        | Authentication
        |--------------------------------------------------------------------------
        */
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Purchased Events
        |--------------------------------------------------------------------------
        */
        const events = await (0, purchase_service_1.getMyEvents)(userId);
        return res.status(200).json({
            success: true,
            events,
        });
    }
    catch (error) {
        console.error("MY EVENTS ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error?.message ??
                "Unable to load events.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Event Hub
|--------------------------------------------------------------------------
*/
async function getMyEvent(req, res) {
    try {
        const userId = req.user?.userId;
        /*
        |--------------------------------------------------------------------------
        | Authentication
        |--------------------------------------------------------------------------
        */
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Purchase ID
        |--------------------------------------------------------------------------
        */
        const purchaseId = Array.isArray(req.params.purchaseId)
            ? req.params.purchaseId[0]
            : req.params.purchaseId;
        if (!purchaseId) {
            return res.status(400).json({
                success: false,
                message: "Purchase ID is required.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Event Hub
        |--------------------------------------------------------------------------
        */
        const event = await (0, purchase_service_1.getMyEvent)(userId, purchaseId);
        return res.status(200).json({
            success: true,
            event,
        });
    }
    catch (error) {
        console.error("GET MY EVENT ERROR:", error);
        /*
        |--------------------------------------------------------------------------
        | Not Found / Unauthorized Purchase
        |--------------------------------------------------------------------------
        */
        if (error?.message ===
            "Event not found.") {
            return res.status(404).json({
                success: false,
                message: "Event not found.",
            });
        }
        return res.status(400).json({
            success: false,
            message: error?.message ??
                "Unable to load event.",
        });
    }
}
