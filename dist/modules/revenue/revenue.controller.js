"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRevenue = eventRevenue;
const revenue_service_1 = require("./revenue.service");
async function eventRevenue(req, res) {
    try {
        const revenue = await (0, revenue_service_1.getEventRevenue)(req.params
            .eventId);
        return res.json({
            success: true,
            revenue,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
