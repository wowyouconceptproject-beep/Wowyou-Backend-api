import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  requireFeature,
} from "../billing/billing.middleware";

import {
  announcements,
  create,
  pin,
  remove,
} from "./announcement.controller";

const router = Router();

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

router.get(
  "/:eventId/announcements",
  auth,
  requireFeature(
    "ANNOUNCEMENTS",
  ),
  announcements,
);

/*
|--------------------------------------------------------------------------
| Create Announcement
|--------------------------------------------------------------------------
*/

router.post(
  "/:eventId/announcements",
  auth,
  requireFeature(
    "ANNOUNCEMENTS",
  ),
  create,
);

/*
|--------------------------------------------------------------------------
| Pin / Unpin Announcement
|--------------------------------------------------------------------------
*/

router.patch(
  "/:eventId/announcements/:id/pin",
  auth,
  requireFeature(
    "ANNOUNCEMENTS",
  ),
  pin,
);

/*
|--------------------------------------------------------------------------
| Delete Announcement
|--------------------------------------------------------------------------
*/

router.delete(
  "/:eventId/announcements/:id",
  auth,
  requireFeature(
    "ANNOUNCEMENTS",
  ),
  remove,
);

export default router;