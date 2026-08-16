"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const billing_middleware_1 = require("../billing/billing.middleware");
const staff_controller_1 = require("./staff.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Staff Management
|--------------------------------------------------------------------------
|
| STAFF_MANAGEMENT is included in:
|
| PROFESSIONAL
| BUSINESS
| ENTERPRISE
|
| STARTER does not have staff management.
|
*/
/*
|--------------------------------------------------------------------------
| Create Staff
|--------------------------------------------------------------------------
*/
router.post("/:eventId/staff", auth_middleware_1.auth, (0, billing_middleware_1.requireFeature)("STAFF_MANAGEMENT"), staff_controller_1.create);
/*
|--------------------------------------------------------------------------
| List Staff
|--------------------------------------------------------------------------
*/
router.get("/:eventId/staff", auth_middleware_1.auth, (0, billing_middleware_1.requireFeature)("STAFF_MANAGEMENT"), staff_controller_1.list);
/*
|--------------------------------------------------------------------------
| Get Staff
|--------------------------------------------------------------------------
*/
router.get("/staff/:staffId", auth_middleware_1.auth, (0, billing_middleware_1.requireFeature)("STAFF_MANAGEMENT"), staff_controller_1.get);
/*
|--------------------------------------------------------------------------
| Regenerate Access Code
|--------------------------------------------------------------------------
*/
router.post("/staff/:staffId/regenerate", auth_middleware_1.auth, (0, billing_middleware_1.requireFeature)("STAFF_MANAGEMENT"), staff_controller_1.regenerate);
/*
|--------------------------------------------------------------------------
| Disable Staff
|--------------------------------------------------------------------------
*/
router.patch("/staff/:staffId/disable", auth_middleware_1.auth, (0, billing_middleware_1.requireFeature)("STAFF_MANAGEMENT"), staff_controller_1.disable);
exports.default = router;
