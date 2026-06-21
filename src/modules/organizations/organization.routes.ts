import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  create,
  me,
} from "./organization.controller";

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

export default router;