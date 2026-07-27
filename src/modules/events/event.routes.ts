import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import staffRoutes from "./staff.routes";
import activityRoutes from "./activity.routes";
import announcementRoutes from "./announcement.routes";

import {
  NetworkingController,
} from "../networking/networking.controller";

import {
  create,
  myEvents,
  getEvent,
  publish,
  getPublicEvent,
  publicEvents,
  register,
  myRegistrations,
  attendees,
} from "./event.controller";

const router = Router();

const networkingController =
  new NetworkingController();

/*
|--------------------------------------------------------------------------
| Event Creation
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  auth,
  create,
);

/*
|--------------------------------------------------------------------------
| Organizer Events
|--------------------------------------------------------------------------
*/

router.get(
  "/my",
  auth,
  myEvents,
);

router.get(
  "/:id",
  auth,
  getEvent,
);

router.patch(
  "/:id/publish",
  auth,
  publish,
);

/*
|--------------------------------------------------------------------------
| Public Discovery
|--------------------------------------------------------------------------
*/

router.get(
  "/public",
  publicEvents,
);

router.get(
  "/public/:id",
  getPublicEvent,
);

/*
|--------------------------------------------------------------------------
| Attendee Registration
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/register",
  auth,
  register,
);

router.get(
  "/my-registrations",
  auth,
  myRegistrations,
);

/*
|--------------------------------------------------------------------------
| Event Attendees
|--------------------------------------------------------------------------
*/

router.get(
  "/:eventId/attendees",
  auth,
  attendees,
);

/*
|--------------------------------------------------------------------------
| Networking
|--------------------------------------------------------------------------
*/

router.get(
  "/:eventId/networking",
  auth,
  networkingController
    .getMatches
    .bind(
      networkingController,
    ),
);

/*
|--------------------------------------------------------------------------
| Event Modules
|--------------------------------------------------------------------------
*/

router.use(
  "/",
  staffRoutes,
);

router.use(
  "/",
  activityRoutes,
);

router.use(
  "/",
  announcementRoutes,
);

export default router;