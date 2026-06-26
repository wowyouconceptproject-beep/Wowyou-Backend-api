"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPass = getPass;
exports.securePass = securePass;
exports.verifyPass = verifyPass;
exports.checkIn = checkIn;
const pass_service_1 = require("./pass.service");
const pass_service_2 = require("./pass.service");
const pass_service_3 = require("./pass.service");
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
        const result = await (0, pass_service_2.verifySecurePass)(req.body.token);
        return res.json({
            success: true,
            attendee: {
                id: result.purchase.user.id,
                name: `${result.purchase.user.firstName} ${result.purchase.user.lastName}`,
                email: result.purchase.user.email,
            },
            ticket: {
                id: result.purchase.ticket.id,
                name: result.purchase.ticket.name,
            },
            event: {
                id: result.purchase.event.id,
                title: result.purchase.event.title,
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
        const result = await (0, pass_service_3.checkInPass)(req.body.token, req.user.userId);
        return res.json({
            success: true,
            attendance: result.attendance,
            attendee: `${result.purchase.userId}`,
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
