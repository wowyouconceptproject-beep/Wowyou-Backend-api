"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const staff_routes_1 = __importDefault(require("./staff.routes"));
const event_controller_1 = require("./event.controller");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.auth, event_controller_1.create);
router.patch("/:id/publish", auth_middleware_1.auth, event_controller_1.publish);
router.post("/:id/register", auth_middleware_1.auth, event_controller_1.register);
router.get("/my", auth_middleware_1.auth, event_controller_1.myEvents);
router.get("/public", event_controller_1.publicEvents);
router.get("/my-registrations", auth_middleware_1.auth, event_controller_1.myRegistrations);
router.get("/:id", auth_middleware_1.auth, event_controller_1.getEvent);
router.use("/", staff_routes_1.default);
exports.default = router;
