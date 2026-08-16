"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const billing_middleware_1 = require("../billing/billing.middleware");
const activity_controller_1 = require("./activity.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Event Activity
|--------------------------------------------------------------------------
|
| OPERATIONS is included in:
|
| PROFESSIONAL
| BUSINESS
| ENTERPRISE
|
| STARTER does not have operations access.
|
*/
router.get("/:eventId/activity", auth_middleware_1.auth, (0, billing_middleware_1.requireFeature)("OPERATIONS"), activity_controller_1.activity);
exports.default = router;
