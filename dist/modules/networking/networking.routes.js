"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const networking_controller_1 = require("./networking.controller");
const router = (0, express_1.Router)();
const controller = new networking_controller_1.NetworkingController();
router.get("/events/:eventId/networking", auth_middleware_1.auth, controller.getMatches.bind(controller));
exports.default = router;
