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

import {
  getDashboard,
} from "./operations.controller";

import {
  activity,
} from "./activity.controller";

import {
  scan,
} from "./operations.controller";

import announcementRoutes
  from "./announcement.routes";

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
  ),
  scan
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

router.get(
  "/dashboard",
  opsAuth,
  getDashboard
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
  ),
  activity
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

router.use(
  "/announcements",
  announcementRoutes
);

export default router;