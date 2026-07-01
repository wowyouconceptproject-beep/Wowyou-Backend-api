import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  create,
  list,
  get,
  regenerate,
  disable,
} from "./staff.controller";

const router = Router();

/*
|--------------------------------------------------------------------------
| Staff
|--------------------------------------------------------------------------
*/

router.post(
  "/:eventId/staff",
  auth,
  create
);

router.get(
  "/:eventId/staff",
  auth,
  list
);

router.get(
  "/staff/:staffId",
  auth,
  get
);

router.post(
  "/staff/:staffId/regenerate",
  auth,
  regenerate
);

router.patch(
  "/staff/:staffId/disable",
  auth,
  disable
);

export default router;