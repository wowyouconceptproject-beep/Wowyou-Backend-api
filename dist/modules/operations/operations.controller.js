"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myEvents = myEvents;
const operations_service_1 = require("./operations.service");
async function myEvents(req, res) {
    try {
        const events = await (0, operations_service_1.getAssignedEvents)(req.user.userId);
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
