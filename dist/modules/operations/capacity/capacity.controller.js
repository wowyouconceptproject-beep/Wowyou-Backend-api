"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capacity = capacity;
const capacity_service_1 = require("./capacity.service");
/*
|--------------------------------------------------------------------------
| Event Capacity
|--------------------------------------------------------------------------
*/
async function capacity(req, res) {
    try {
        const eventId = String(req.params.eventId);
        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: "Event ID is required.",
            });
        }
        const result = await (0, capacity_service_1.getCapacity)(eventId);
        return res.json({
            success: true,
            capacity: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
