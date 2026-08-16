import {
  Router,
} from "express";

import {
  auth,
} from "../auth/auth.middleware";

import {
  requireActiveSubscription,
} from "../billing/billing.middleware";

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

const router =
  Router();

const networkingController =
  new NetworkingController();

/*
|--------------------------------------------------------------------------
| Event Creation
|--------------------------------------------------------------------------
|
| Creating and managing organizer events requires an active subscription.
|
*/

router.post(
  "/",
  auth,
  requireActiveSubscription,
  create,
);

/*
|--------------------------------------------------------------------------
| Public Discovery
|--------------------------------------------------------------------------
|
| These routes MUST appear before /:id.
|
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
| Organizer Events
|--------------------------------------------------------------------------
*/

router.get(
  "/my",
  auth,
  requireActiveSubscription,
  myEvents,
);

router.get(
  "/my-registrations",
  auth,
  myRegistrations,
);

router.get(
  "/:id",
  auth,
  requireActiveSubscription,
  getEvent,
);

router.patch(
  "/:id/publish",
  auth,
  requireActiveSubscription,
  publish,
);

/*
|--------------------------------------------------------------------------
| Attendee Registration
|--------------------------------------------------------------------------
|
| These do NOT require an organizer subscription.
|
*/

router.post(
  "/:id/register",
  auth,
  register,
);

/*
|--------------------------------------------------------------------------
| Event Attendees
|--------------------------------------------------------------------------
|
| Organizer functionality.
|
*/

router.get(
  "/:eventId/attendees",
  auth,
  requireActiveSubscription,
  attendees,
);

/*
|--------------------------------------------------------------------------
| Networking
|--------------------------------------------------------------------------
|
| Organizer networking infrastructure requires an active subscription.
|
*/

router.get(
  "/:eventId/networking",
  auth,
  requireActiveSubscription,
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
|
| These modules have their own authentication.
| Their subscription protection should be added inside their respective
| route files so individual permissions/features can be controlled later.
|
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