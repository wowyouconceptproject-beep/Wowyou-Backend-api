import { Router } from "express";

import {
  login,
  me,
  keepAlive,
  signOut,
  getDashboard,
  scan,
  getReports,
} from "./operations.controller";

import {
  verify,
  manual,
  search,
} from "./scan.controller";

import {
  opsAuth,
} from "./ops.middleware";

import {
  requirePermission,
} from "./permission.middleware";

import {
  Permissions,
} from "./operations.permissions";

import {
  submitPulseObservation,
} from "./pulse.controller";

const router = Router();

/*
|--------------------------------------------------------------------------
| Operations Authentication
|--------------------------------------------------------------------------
*/

// Staff access-code login
router.post(
  "/access",
  login,
);

// Get authenticated staff and event information
router.get(
  "/me",
  opsAuth,
  me,
);

// Keep the operations session alive
router.post(
  "/heartbeat",
  opsAuth,
  keepAlive,
);

// End the operations session
router.post(
  "/logout",
  opsAuth,
  signOut,
);

/*
|--------------------------------------------------------------------------
| Scanner and Pass Verification
|--------------------------------------------------------------------------
*/

// Scan a QR code and process check-in
router.post(
  "/scan",
  opsAuth,
  requirePermission(
    Permissions.SCAN_QR,
  ),
  scan,
);

// Verify a ticket pass without checking it in
router.post(
  "/verify-pass",
  opsAuth,
  requirePermission(
    Permissions.VERIFY_PASS,
  ),
  verify,
);

// Manually check in an attendee using their purchase ID
router.post(
  "/manual-checkin",
  opsAuth,
  requirePermission(
    Permissions.MANUAL_CHECK_IN,
  ),
  manual,
);

/*
|--------------------------------------------------------------------------
| Attendee Search
|--------------------------------------------------------------------------
*/

// Search paid ticket purchases for the authenticated staff member's event
router.post(
  "/search",
  opsAuth,
  requirePermission(
    Permissions.SEARCH_ATTENDEE,
  ),
  search,
);

/*
|--------------------------------------------------------------------------
| Dashboard and Reports
|--------------------------------------------------------------------------
*/

// Operations dashboard
router.get(
  "/dashboard",
  opsAuth,
  requirePermission(
    Permissions.VIEW_DASHBOARD,
  ),
  getDashboard,
);

router.post(
  "/pulse",
  opsAuth,
  submitPulseObservation,
);

// Operations reports
router.get(
  "/reports",
  opsAuth,
  requirePermission(
    Permissions.VIEW_REPORTS,
  ),
  getReports,
);

export default router;