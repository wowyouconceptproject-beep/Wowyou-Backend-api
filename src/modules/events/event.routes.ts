import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import staffRoutes from "./staff.routes";
import activityRoutes from "./activity.routes";
import announcementRoutes from "./announcement.routes";

import { NetworkingController } from "../networking/networking.controller";

import {
  create,
  myEvents,
  getEvent,
  publish,
  publicEvents,
  register,
  myRegistrations,
  attendees,
} from "./event.controller";

const router = Router();

const networkingController =
  new NetworkingController();

router.post(
  "/",
  auth,
  create,
);

router.patch(
  "/:id/publish",
  auth,
  publish,
);

router.post(
  "/:id/register",
  auth,
  register,
);

router.get(
  "/my",
  auth,
  myEvents,
);

router.get(
  "/public",
  publicEvents,
);

router.get(
  "/my-registrations",
  auth,
  myRegistrations,
);

router.get(
  "/:id",
  auth,
  getEvent,
);

router.get(
  "/:eventId/attendees",
  auth,
  attendees,
);

router.get(
  "/:eventId/networking",
  auth,
  networkingController.getMatches.bind(
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