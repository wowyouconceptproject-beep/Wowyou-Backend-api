import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  create,
  myEvents,
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

export default router;