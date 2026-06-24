"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.list = list;
const ticket_service_1 = require("./ticket.service");
async function create(req, res) {
    try {
        const ticket = await (0, ticket_service_1.createTicket)(req.params.eventId, req.body);
        return res.status(201).json({
            success: true,
            ticket,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
async function list(req, res) {
    try {
        const result = await (0, ticket_service_1.getTickets)(req.params.eventId);
        return res.json({
            success: true,
            currency: result.currency,
            tickets: result.tickets,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
