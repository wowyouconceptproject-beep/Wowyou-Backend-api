"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkingController = void 0;
const networking_service_1 = require("./networking.service");
class NetworkingController {
    service = new networking_service_1.NetworkingService();
    // ============================================
    // ROUTE PARAMETER HELPER
    // ============================================
    getRouteParam(value) {
        if (!value)
            return null;
        return Array.isArray(value) ? value[0] ?? null : value;
    }
    // ============================================
    // AUTH HELPERS
    // ============================================
    getUserId(req) {
        return req.user?.userId ?? null;
    }
    unauthorized(res) {
        res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }
    handleError(res, error, message) {
        console.error(`[NETWORKING ERROR] ${message}`, error);
        res.status(500).json({
            success: false,
            message,
            error: error instanceof Error
                ? error.message
                : String(error),
        });
    }
    // ============================================
    // GET MATCHES
    // ============================================
    async getMatches(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId)
                return this.unauthorized(res);
            const eventId = this.getRouteParam(req.params.eventId);
            if (!eventId) {
                res.status(400).json({
                    success: false,
                    message: "Event ID is required.",
                });
                return;
            }
            const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
            const matches = await this.service.getMatches(userId, eventId, limit);
            res.status(200).json({
                success: true,
                matches,
            });
        }
        catch (error) {
            this.handleError(res, error, "Failed to retrieve networking matches.");
        }
    }
    // ============================================
    // GET NETWORKING PROFILE
    // ============================================
    async getProfile(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId)
                return this.unauthorized(res);
            const profile = await this.service.getProfile(userId);
            res.status(200).json({
                success: true,
                profile,
            });
        }
        catch (error) {
            this.handleError(res, error, "Failed to retrieve networking profile.");
        }
    }
    // ============================================
    // UPDATE NETWORKING PROFILE
    // ============================================
    async updateProfile(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId)
                return this.unauthorized(res);
            const profile = await this.service.updateProfile(userId, req.body);
            res.status(200).json({
                success: true,
                message: "Networking profile updated.",
                profile,
            });
        }
        catch (error) {
            this.handleError(res, error, "Failed to update networking profile.");
        }
    }
    // ============================================
    // SEND CONNECTION REQUEST
    // ============================================
    async sendRequest(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId)
                return this.unauthorized(res);
            const receiverId = req.body.receiverId;
            const eventId = req.body.eventId;
            const message = req.body.message;
            if (!receiverId || !eventId) {
                res.status(400).json({
                    success: false,
                    message: "Receiver ID and event ID are required.",
                });
                return;
            }
            const request = await this.service.sendRequest(userId, receiverId, eventId, message);
            res.status(201).json({
                success: true,
                message: "Connection request sent.",
                request,
            });
        }
        catch (error) {
            this.handleError(res, error, "Failed to send connection request.");
        }
    }
    // ============================================
    // ACCEPT REQUEST
    // ============================================
    async acceptRequest(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId)
                return this.unauthorized(res);
            const requestId = this.getRouteParam(req.params.requestId);
            if (!requestId) {
                res.status(400).json({
                    success: false,
                    message: "Request ID is required.",
                });
                return;
            }
            const connection = await this.service.acceptRequest(userId, requestId);
            res.status(200).json({
                success: true,
                message: "Connection request accepted.",
                connection,
            });
        }
        catch (error) {
            this.handleError(res, error, "Failed to accept connection request.");
        }
    }
    // ============================================
    // REJECT REQUEST
    // ============================================
    async rejectRequest(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId)
                return this.unauthorized(res);
            const requestId = this.getRouteParam(req.params.requestId);
            if (!requestId) {
                res.status(400).json({
                    success: false,
                    message: "Request ID is required.",
                });
                return;
            }
            const request = await this.service.rejectRequest(userId, requestId);
            res.status(200).json({
                success: true,
                message: "Connection request rejected.",
                request,
            });
        }
        catch (error) {
            this.handleError(res, error, "Failed to reject connection request.");
        }
    }
    // ============================================
    // CANCEL REQUEST
    // ============================================
    async cancelRequest(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId)
                return this.unauthorized(res);
            const requestId = this.getRouteParam(req.params.requestId);
            if (!requestId) {
                res.status(400).json({
                    success: false,
                    message: "Request ID is required.",
                });
                return;
            }
            const request = await this.service.cancelRequest(userId, requestId);
            res.status(200).json({
                success: true,
                message: "Connection request cancelled.",
                request,
            });
        }
        catch (error) {
            this.handleError(res, error, "Failed to cancel connection request.");
        }
    }
    // ============================================
    // INCOMING REQUESTS
    // ============================================
    async getIncomingRequests(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId)
                return this.unauthorized(res);
            const requests = await this.service.getIncomingRequests(userId);
            res.status(200).json({
                success: true,
                requests,
            });
        }
        catch (error) {
            this.handleError(res, error, "Failed to retrieve incoming requests.");
        }
    }
    // ============================================
    // OUTGOING REQUESTS
    // ============================================
    async getOutgoingRequests(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId)
                return this.unauthorized(res);
            const requests = await this.service.getOutgoingRequests(userId);
            res.status(200).json({
                success: true,
                requests,
            });
        }
        catch (error) {
            this.handleError(res, error, "Failed to retrieve outgoing requests.");
        }
    }
    // ============================================
    // ACCEPTED CONNECTIONS
    // ============================================
    async getConnections(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId)
                return this.unauthorized(res);
            const connections = await this.service.getConnections(userId);
            res.status(200).json({
                success: true,
                connections,
            });
        }
        catch (error) {
            this.handleError(res, error, "Failed to retrieve connections.");
        }
    }
    // ============================================
    // REMOVE CONNECTION
    // ============================================
    async removeConnection(req, res) {
        try {
            const userId = this.getUserId(req);
            if (!userId)
                return this.unauthorized(res);
            const connectionId = this.getRouteParam(req.params.connectionId);
            if (!connectionId) {
                res.status(400).json({
                    success: false,
                    message: "Connection ID is required.",
                });
                return;
            }
            await this.service.removeConnection(userId, connectionId);
            res.status(200).json({
                success: true,
                message: "Connection removed.",
            });
        }
        catch (error) {
            this.handleError(res, error, "Failed to remove connection.");
        }
    }
}
exports.NetworkingController = NetworkingController;
