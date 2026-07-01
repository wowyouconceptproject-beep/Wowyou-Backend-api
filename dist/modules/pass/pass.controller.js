"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPass = getPass;
exports.securePass = securePass;
exports.verifyPass = verifyPass;
exports.checkIn = checkIn;
const pass_service_1 = require("./pass.service");
async function getPass(req, res) {
    try {
        const pass = await (0, pass_service_1.getEventPass)(req.params.purchaseId, req.user.userId);
        return res.json({
            success: true,
            pass,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
async function securePass(req, res) {
    try {
        const result = await (0, pass_service_1.generateSecurePass)(req.params.purchaseId, req.user.userId);
        return res.json({
            success: true,
            token: result.token,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
async function verifyPass(req, res) {
    try {
        const result = await (0, pass_service_1.verifySecurePass)(req.body.token);
        const purchase = result.purchase;
        return res.json({
            success: true,
            attendee: {
                id: purchase.user.id,
                name: `${purchase.user.firstName} ${purchase.user.lastName}`,
                email: purchase.user.email,
            },
            ticket: {
                id: purchase.ticket.id,
                name: purchase.ticket.name,
            },
            event: {
                id: purchase.event.id,
                title: purchase.event.title,
            },
            alreadyCheckedIn: result.alreadyCheckedIn,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
async function checkIn(req, res) {
    try {
        const result = await (0, pass_service_1.checkInPass)(req.body.token, req.user.userId);
        const purchase = result.purchase;
        return res.json({
            success: true,
            attendance: result.attendance,
            totalTickets: result.totalTickets,
            remaining: result.remaining,
            attendee: {
                id: purchase.userId,
            },
            message: "Attendee checked in successfully.",
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
