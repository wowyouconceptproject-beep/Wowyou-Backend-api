import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  create,
  myEvents,
  getEvent,
  publish,
  publicEvents,
  register,
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
  "/:id",
  auth,
  getEvent
);

export default router;