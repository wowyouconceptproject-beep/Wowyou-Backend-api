"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activity = activity;
const activity_service_1 = require("./activity.service");
/*
|--------------------------------------------------------------------------
| Activity Feed
|--------------------------------------------------------------------------
*/
async function activity(req, res) {
    try {
        const limit = Number(req.query.limit) ||
            50;
        const result = await (0, activity_service_1.listActivity)(req.staff.eventId, limit);
        return res.json({
            success: true,
            activity: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
