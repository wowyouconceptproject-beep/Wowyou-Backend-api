import { Router } from "express";

import { auth } from "../auth/auth.middleware";

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
*/

router.get(
  "/:eventId/announcements",
  auth,
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
  remove,
);

export default router;