"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const staff_routes_1 = __importDefault(require("./staff.routes"));
const activity_routes_1 = __importDefault(require("./activity.routes"));
const announcement_routes_1 = __importDefault(require("./announcement.routes"));
const networking_controller_1 = require("../networking/networking.controller");
const event_controller_1 = require("./event.controller");
const router = (0, express_1.Router)();
const networkingController = new networking_controller_1.NetworkingController();
/*
|--------------------------------------------------------------------------
| Event Creation
|--------------------------------------------------------------------------
*/
router.post("/", auth_middleware_1.auth, event_controller_1.create);
/*
|--------------------------------------------------------------------------
| Public Discovery
|--------------------------------------------------------------------------
|
| IMPORTANT:
| These routes MUST appear before /:id.
|
| Otherwise /public can be interpreted as:
|
| /:id
|
| and sent to the authenticated organizer
| event handler.
|
*/
router.get("/public", event_controller_1.publicEvents);
router.get("/public/:id", event_controller_1.getPublicEvent);
/*
|--------------------------------------------------------------------------
| Organizer Events
|--------------------------------------------------------------------------
*/
router.get("/my", auth_middleware_1.auth, event_controller_1.myEvents);
router.get("/:id", auth_middleware_1.auth, event_controller_1.getEvent);
router.patch("/:id/publish", auth_middleware_1.auth, event_controller_1.publish);
/*
|--------------------------------------------------------------------------
| Attendee Registration
|--------------------------------------------------------------------------
*/
router.post("/:id/register", auth_middleware_1.auth, event_controller_1.register);
router.get("/my-registrations", auth_middleware_1.auth, event_controller_1.myRegistrations);
/*
|--------------------------------------------------------------------------
| Event Attendees
|--------------------------------------------------------------------------
*/
router.get("/:eventId/attendees", auth_middleware_1.auth, event_controller_1.attendees);
/*
|--------------------------------------------------------------------------
| Networking
|--------------------------------------------------------------------------
*/
router.get("/:eventId/networking", auth_middleware_1.auth, networkingController
    .getMatches
    .bind(networkingController));
/*
|--------------------------------------------------------------------------
| Event Modules
|--------------------------------------------------------------------------
*/
router.use("/", staff_routes_1.default);
router.use("/", activity_routes_1.default);
router.use("/", announcement_routes_1.default);
exports.default = router;
