"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPulse = getPulse;
exports.getHeatmap = getHeatmap;
const pulse_service_1 = require("./pulse.service");
const heatmap_service_1 = require("./heatmap.service");
/*
|--------------------------------------------------------------------------
| Sentient Pulse
|--------------------------------------------------------------------------
*/
async function getPulse(req, res) {
    try {
        const eventId = String(req.params.eventId ||
            "").trim();
        if (!eventId) {
            return res
                .status(400)
                .json({
                success: false,
                message: "eventId is required.",
            });
        }
        const pulse = await (0, pulse_service_1.getEventPulse)(eventId);
        return res.json({
            success: true,
            pulse,
        });
    }
    catch (error) {
        console.error("Event pulse error:", error);
        return res
            .status(500)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to calculate event pulse.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Heatmap
|--------------------------------------------------------------------------
*/
async function getHeatmap(req, res) {
    try {
        const eventId = String(req.params.eventId ||
            "").trim();
        if (!eventId) {
            return res
                .status(400)
                .json({
                success: false,
                message: "eventId is required.",
            });
        }
        const heatmap = await (0, heatmap_service_1.getEventHeatmap)(eventId);
        return res.json({
            success: true,
            heatmap,
        });
    }
    catch (error) {
        console.error("Event heatmap error:", error);
        return res
            .status(500)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to calculate event heatmap.",
        });
    }
}
