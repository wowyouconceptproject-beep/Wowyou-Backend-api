"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("./settings.controller");
const auth_middleware_1 = require("../../modules/auth/auth.middleware");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Attendee
|--------------------------------------------------------------------------
*/
router.get("/attendee", auth_middleware_1.auth, settings_controller_1.attendeeSettings);
router.put("/attendee", auth_middleware_1.auth, settings_controller_1.updateAttendeeSettings);
/*
|--------------------------------------------------------------------------
| Organizer
|--------------------------------------------------------------------------
*/
router.get("/organizer", auth_middleware_1.auth, settings_controller_1.organizerSettings);
router.put("/organizer", auth_middleware_1.auth, settings_controller_1.updateOrganizerSettings);
/*
|--------------------------------------------------------------------------
| Vendor
|--------------------------------------------------------------------------
*/
router.get("/vendor", auth_middleware_1.auth, settings_controller_1.vendorSettings);
router.put("/vendor", auth_middleware_1.auth, settings_controller_1.updateVendorSettings);
exports.default = router;
