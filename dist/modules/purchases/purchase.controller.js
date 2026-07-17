"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
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
        const result = await (0, purchase_service_1.createPurchase)(req.user.userId, req.body.ticketTypeId, Number(req.body.quantity));
        return res.status(201).json({
            success: true,
            checkoutUrl: result.checkoutUrl,
            purchase: result.purchase,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
|--------------------------------------------------------------------------
| Legacy Tickets
|--------------------------------------------------------------------------
*/
async function myTickets(req, res) {
    try {
        const tickets = await (0, purchase_service_1.getMyTickets)(req.user.userId);
        return res.json({
            success: true,
            tickets,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
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
        const events = await (0, purchase_service_1.getMyEvents)(req.user.userId);
        return res.json({
            success: true,
            events,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
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
        const purchaseId = Array.isArray(req.params.purchaseId)
            ? req.params.purchaseId[0]
            : req.params.purchaseId;
        if (!purchaseId) {
            return res.status(400).json({
                success: false,
                message: "Purchase ID is required.",
            });
        }
        const event = await (0, purchase_service_1.getMyEvent)(req.user.userId, purchaseId);
        return res.json({
            success: true,
            event,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
