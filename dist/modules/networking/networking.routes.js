"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const networking_controller_1 = require("./networking.controller");
const router = (0, express_1.Router)();
const controller = new networking_controller_1.NetworkingController();
// Matches
router.get("/events/:eventId/networking", auth_middleware_1.auth, controller.getMatches.bind(controller));
// Profile
router.get("/profile", auth_middleware_1.auth, controller.getProfile.bind(controller));
router.patch("/profile", auth_middleware_1.auth, controller.updateProfile.bind(controller));
// Connection requests
router.post("/requests", auth_middleware_1.auth, controller.sendRequest.bind(controller));
router.get("/requests/incoming", auth_middleware_1.auth, controller.getIncomingRequests.bind(controller));
router.get("/requests/outgoing", auth_middleware_1.auth, controller.getOutgoingRequests.bind(controller));
router.post("/requests/:requestId/accept", auth_middleware_1.auth, controller.acceptRequest.bind(controller));
router.post("/requests/:requestId/reject", auth_middleware_1.auth, controller.rejectRequest.bind(controller));
router.post("/requests/:requestId/cancel", auth_middleware_1.auth, controller.cancelRequest.bind(controller));
// Connections
router.get("/connections", auth_middleware_1.auth, controller.getConnections.bind(controller));
router.delete("/connections/:connectionId", auth_middleware_1.auth, controller.removeConnection.bind(controller));
exports.default = router;
