"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkingController = void 0;
const networking_service_1 = require("./networking.service");
class NetworkingController {
    service = new networking_service_1.NetworkingService();
    async getMatches(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
                return;
            }
            const eventId = req.params.eventId;
            if (typeof eventId !== "string") {
                res.status(400).json({
                    success: false,
                    message: "Event ID is required.",
                });
                return;
            }
            const limit = Number(req.query.limit) || 20;
            const matches = await this.service.getMatches(userId, eventId, limit);
            res.status(200).json({
                success: true,
                matches,
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: "Failed to retrieve networking matches.",
            });
        }
    }
}
exports.NetworkingController = NetworkingController;
