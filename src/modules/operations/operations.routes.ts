import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  myEvents,
} from "./operations.controller";

const router = Router();

router.get(
  "/events",
  auth,
  myEvents
);

export default router;