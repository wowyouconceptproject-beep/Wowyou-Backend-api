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
router.post("/scan", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.SCAN_QR)
// scanController.scan
);
router.post("/manual-checkin", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.MANUAL_CHECK_IN)
// scanController.manualCheckIn
);
router.post("/search", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.SEARCH_ATTENDEE)
// scanController.search
);
/*
|--------------------------------------------------------------------------
| Activity
|--------------------------------------------------------------------------
*/
router.get("/activity", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.VIEW_ACTIVITY)
// activityController.list
);
/*
|--------------------------------------------------------------------------
| Announcements
|--------------------------------------------------------------------------
*/
router.post("/announcement", ops_middleware_1.opsAuth, (0, permission_middleware_1.requirePermission)(operations_permissions_1.Permissions.SEND_ANNOUNCEMENT)
// announcementController.create
);
exports.default = router;
