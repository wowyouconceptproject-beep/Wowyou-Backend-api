import { Router } from "express";

import {
  login,
  me,
  keepAlive,
  signOut,
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
  login
);

router.get(
  "/me",
  opsAuth,
  me
);

router.post(
  "/heartbeat",
  opsAuth,
  keepAlive
);

router.post(
  "/logout",
  opsAuth,
  signOut
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
    Permissions.SCAN_QR
  )
  // scanController.scan
);

router.post(
  "/manual-checkin",
  opsAuth,
  requirePermission(
    Permissions.MANUAL_CHECK_IN
  )
  // scanController.manualCheckIn
);

router.post(
  "/search",
  opsAuth,
  requirePermission(
    Permissions.SEARCH_ATTENDEE
  )
  // scanController.search
);

/*
|--------------------------------------------------------------------------
| Activity
|--------------------------------------------------------------------------
*/

router.get(
  "/activity",
  opsAuth,
  requirePermission(
    Permissions.VIEW_ACTIVITY
  )
  // activityController.list
);

/*
|--------------------------------------------------------------------------
| Announcements
|--------------------------------------------------------------------------
*/

router.post(
  "/announcement",
  opsAuth,
  requirePermission(
    Permissions.SEND_ANNOUNCEMENT
  )
  // announcementController.create
);

export default router;