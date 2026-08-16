import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  requireFeature,
} from "../billing/billing.middleware";

import {
  activity,
} from "./activity.controller";

const router = Router();

/*
|--------------------------------------------------------------------------
| Event Activity
|--------------------------------------------------------------------------
|
| OPERATIONS is included in:
|
| PROFESSIONAL
| BUSINESS
| ENTERPRISE
|
| STARTER does not have operations access.
|
*/

router.get(
  "/:eventId/activity",
  auth,
  requireFeature(
    "OPERATIONS",
  ),
  activity,
);

export default router;