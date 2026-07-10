import { Router } from "express";

import {
  opsAuth,
} from "./ops.middleware";

import {
  announcements,
  create,
  pin,
  remove,
} from "./announcement.controller";

const router =
  Router();

/*
|--------------------------------------------------------------------------
| List Announcements
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  opsAuth,
  announcements
);

/*
|--------------------------------------------------------------------------
| Create Announcement
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  opsAuth,
  create
);

/*
|--------------------------------------------------------------------------
| Pin / Unpin Announcement
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/pin",
  opsAuth,
  pin
);

/*
|--------------------------------------------------------------------------
| Delete Announcement
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  opsAuth,
  remove
);

export default router;