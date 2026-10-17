"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const operations_controller_1 = require("./operations.controller");
const scan_controller_1 = require("./scan.controller");
const ops_middleware_1 = require("./ops.middleware");
const permission_middleware_1 = require("./permission.middleware");
const operations_permissions_1 = require("./operations.permissions");
const pulse_controller_1 = require("./pulse.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Operations Authentication
|--------------------------------------------------------------------------
*/
// Staff access-code login
router.post("/access", operations_controller_1.login);
// Get authenticated staff and event information
router.get("/me", ops_middleware_1.opsAuth, operations_controller_1.me);
// Keep the operations session alive
router.post("/heartbeat", ops_middleware_1.opsAuth, operations_controller_1.keepAlive);
// End the operations session
router.post("/logout", ops_middleware_1.opsAuth, operations_controller_1.signOut);
/*
|--------------------------------------------------------------------------
| Scanner and Pass Verification
|--------------------------------------------------------------------------
*/
// Scan a QR code and process check-in
router.post("/scan", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.SCAN_QR), operations_controller_1.scan);
// Verify a ticket pass without checking it in
router.post("/verify-pass", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.VERIFY_PASS), scan_controller_1.verify);
// Manually check in an attendee using their purchase ID
router.post("/manual-checkin", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.MANUAL_CHECK_IN), scan_controller_1.manual);
/*
|--------------------------------------------------------------------------
| Attendee Search
|--------------------------------------------------------------------------
*/
// Search paid ticket purchases for the authenticated staff member's event
router.post("/search", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.SEARCH_ATTENDEE), scan_controller_1.search);
/*
|--------------------------------------------------------------------------
| Dashboard and Reports
|--------------------------------------------------------------------------
*/
// Operations dashboard
router.get("/dashboard", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.VIEW_DASHBOARD), operations_controller_1.getDashboard);
router.post("/pulse", ops_middleware_1.opsAuth, pulse_controller_1.submitPulseObservation);
// Operations reports
router.get("/reports", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.VIEW_REPORTS), operations_controller_1.getReports);
exports.default = router;
