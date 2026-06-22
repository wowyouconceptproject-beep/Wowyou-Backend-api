import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  create,
  myEvents,
  getEvent,
} from "./event.controller";

const router = Router();

router.post(
  "/",
  auth,
  create
);

router.get(
  "/my",
  auth,
  myEvents
);

router.get(
  "/:id",
  auth,
  getEvent
);

export default router;