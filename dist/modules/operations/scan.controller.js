"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify = verify;
exports.scanCheckIn = scanCheckIn;
exports.undo = undo;
exports.manual = manual;
exports.search = search;
const operations_service_1 = require("./operations.service");
/*
|--------------------------------------------------------------------------
| Verify QR Pass
|--------------------------------------------------------------------------
*/
async function verify(req, res) {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "QR token is required.",
            });
        }
        const result = await (0, operations_service_1.verifyPass)(token, req.staff.eventId);
        return res.json({
            success: true,
            ...result,
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
| Check In
|--------------------------------------------------------------------------
*/
async function scanCheckIn(req, res) {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "QR token is required.",
            });
        }
        const result = await (0, operations_service_1.checkIn)(token, {
            id: req.staff.id,
            eventId: req.staff.eventId,
            station: req.staff.station,
        });
        return res.json(result);
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
| Undo Check In
|--------------------------------------------------------------------------
*/
async function undo(req, res) {
    try {
        const { purchaseId, } = req.body;
        const result = await (0, operations_service_1.undoCheckIn)(purchaseId, {
            id: req.staff.id,
            eventId: req.staff.eventId,
        });
        return res.json(result);
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
| Manual Check In
|--------------------------------------------------------------------------
*/
async function manual(req, res) {
    try {
        const { purchaseId, } = req.body;
        const result = await (0, operations_service_1.manualCheckIn)(purchaseId, {
            id: req.staff.id,
            eventId: req.staff.eventId,
            station: req.staff.station,
        });
        return res.json(result);
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
| Search Attendee
|--------------------------------------------------------------------------
*/
async function search(req, res) {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({
                success: false,
                message: "Search query is required.",
            });
        }
        const attendees = await (0, operations_service_1.searchAttendee)(req.staff.eventId, query);
        return res.json({
            success: true,
            attendees,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
