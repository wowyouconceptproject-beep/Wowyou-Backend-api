"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const billing_middleware_1 = require("../billing/billing.middleware");
const announcement_controller_1 = require("./announcement.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| List Announcements
|--------------------------------------------------------------------------
|
| ANNOUNCEMENTS is included in:
|
| PROFESSIONAL
| BUSINESS
| ENTERPRISE
|
| STARTER does not have announcement access.
|
*/
router.get("/:eventId/announcements", auth_middleware_1.auth, (0, billing_middleware_1.requireFeature)("ANNOUNCEMENTS"), announcement_controller_1.announcements);
/*
|--------------------------------------------------------------------------
| Create Announcement
|--------------------------------------------------------------------------
*/
router.post("/:eventId/announcements", auth_middleware_1.auth, (0, billing_middleware_1.requireFeature)("ANNOUNCEMENTS"), announcement_controller_1.create);
/*
|--------------------------------------------------------------------------
| Pin / Unpin Announcement
|--------------------------------------------------------------------------
*/
router.patch("/:eventId/announcements/:id/pin", auth_middleware_1.auth, (0, billing_middleware_1.requireFeature)("ANNOUNCEMENTS"), announcement_controller_1.pin);
/*
|--------------------------------------------------------------------------
| Delete Announcement
|--------------------------------------------------------------------------
*/
router.delete("/:eventId/announcements/:id", auth_middleware_1.auth, (0, billing_middleware_1.requireFeature)("ANNOUNCEMENTS"), announcement_controller_1.remove);
exports.default = router;
