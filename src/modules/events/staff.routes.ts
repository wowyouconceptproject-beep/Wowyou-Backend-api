import {
  Router,
} from "express";

import {
  auth,
} from "../auth/auth.middleware";

import {
  requireFeature,
} from "../billing/billing.middleware";

import {
  create,
  list,
  get,
  regenerate,
  disable,
} from "./staff.controller";

const router =
  Router();

/*
|--------------------------------------------------------------------------
| Staff Management
|--------------------------------------------------------------------------
|
| STAFF_MANAGEMENT is included in:
|
| PROFESSIONAL
| BUSINESS
| ENTERPRISE
|
| STARTER does not have staff management.
|
*/

/*
|--------------------------------------------------------------------------
| Create Staff
|--------------------------------------------------------------------------
*/

router.post(
  "/:eventId/staff",
  auth,
  requireFeature(
    "STAFF_MANAGEMENT",
  ),
  create,
);

/*
|--------------------------------------------------------------------------
| List Staff
|--------------------------------------------------------------------------
*/

router.get(
  "/:eventId/staff",
  auth,
  requireFeature(
    "STAFF_MANAGEMENT",
  ),
  list,
);

/*
|--------------------------------------------------------------------------
| Get Staff
|--------------------------------------------------------------------------
*/

router.get(
  "/staff/:staffId",
  auth,
  requireFeature(
    "STAFF_MANAGEMENT",
  ),
  get,
);

/*
|--------------------------------------------------------------------------
| Regenerate Access Code
|--------------------------------------------------------------------------
*/

router.post(
  "/staff/:staffId/regenerate",
  auth,
  requireFeature(
    "STAFF_MANAGEMENT",
  ),
  regenerate,
);

/*
|--------------------------------------------------------------------------
| Disable Staff
|--------------------------------------------------------------------------
*/

router.patch(
  "/staff/:staffId/disable",
  auth,
  requireFeature(
    "STAFF_MANAGEMENT",
  ),
  disable,
);

export default router;