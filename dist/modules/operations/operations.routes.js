"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const operations_controller_1 = require("./operations.controller");
const ops_middleware_1 = require("./ops.middleware");
const permission_middleware_1 = require("./permission.middleware");
const operations_permissions_1 = require("./operations.permissions");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/
router.post("/access", operations_controller_1.login);
router.get("/me", ops_middleware_1.opsAuth, operations_controller_1.me);
router.post("/heartbeat", ops_middleware_1.opsAuth, operations_controller_1.keepAlive);
router.post("/logout", ops_middleware_1.opsAuth, operations_controller_1.signOut);
/*
|--------------------------------------------------------------------------
| Scanner
|--------------------------------------------------------------------------
*/
router.post("/scan", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.SCAN_QR), operations_controller_1.scan);
router.post("/manual-checkin", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.MANUAL_CHECK_IN));
router.post("/search", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.SEARCH_ATTENDEE));
router.get("/dashboard", ops_middleware_1.opsAuth, operations_controller_1.getDashboard);
exports.default = router;
