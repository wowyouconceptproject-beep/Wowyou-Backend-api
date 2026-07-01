import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import staffRoutes from "./staff.routes";

import {
  create,
  myEvents,
  getEvent,
  publish,
  publicEvents,
  register,
  myRegistrations,
} from "./event.controller";

const router = Router();

router.post(
  "/",
  auth,
  create
);

router.patch(
  "/:id/publish",
  auth,
  publish
);

router.post(
  "/:id/register",
  auth,
  register
);

router.get(
  "/my",
  auth,
  myEvents
);

router.get(
  "/public",
  publicEvents
);

router.get(
  "/my-registrations",
  auth,
  myRegistrations
);

router.get(
  "/:id",
  auth,
  getEvent
);
router.use("/", staffRoutes);
export default router;