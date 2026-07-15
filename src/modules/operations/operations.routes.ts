import { Router } from "express";

import {
  login,
  me,
  keepAlive,
  signOut,
  getDashboard,
  scan,
} from "./operations.controller";

import {
  opsAuth,
} from "./ops.middleware";

import {
  requirePermission,
} from "./permission.middleware";

import {
  Permissions,
} from "./operations.permissions";

const router = Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.post(
  "/access",
  login,
);

router.get(
  "/me",
  opsAuth,
  me,
);

router.post(
  "/heartbeat",
  opsAuth,
  keepAlive,
);

router.post(
  "/logout",
  opsAuth,
  signOut,
);

/*
|--------------------------------------------------------------------------
| Scanner
|--------------------------------------------------------------------------
*/

router.post(
  "/scan",
  opsAuth,
  requirePermission(
    Permissions.SCAN_QR,
  ),
  scan,
);

router.post(
  "/manual-checkin",
  opsAuth,
  requirePermission(
    Permissions.MANUAL_CHECK_IN,
  ),
  // manualCheckIn
);

router.post(
  "/search",
  opsAuth,
  requirePermission(
    Permissions.SEARCH_ATTENDEE,
  ),
  // searchAttendee
);

router.get(
  "/dashboard",
  opsAuth,
  getDashboard,
);

export default router;