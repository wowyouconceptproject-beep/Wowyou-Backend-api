import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  create,
  me,
  update,
} from "./attendee-profile.controller";

const router = Router();

router.post(
  "/",
  auth,
  create
);

router.get(
  "/me",
  auth,
  me
);

router.patch(
  "/",
  auth,
  update
);

export default router;