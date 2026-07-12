import { Router } from "express";

import {
  create,
  myApplications,
  eventApplications,
  approve,
  reject,
  withdraw,
} from "./vendor.controller";

const router = Router();

/*
|--------------------------------------------------------------------------
| Vendor
|--------------------------------------------------------------------------
*/

/*
POST /vendors/apply
*/

router.post(
  "/apply",
  create,
);

/*
GET /vendors/applications
*/

router.get(
  "/applications",
  myApplications,
);

/*
|--------------------------------------------------------------------------
| Organizer
|--------------------------------------------------------------------------
*/

/*
GET /vendors/events/:eventId
*/

router.get(
  "/events/:eventId",
  eventApplications,
);

/*
PATCH /vendors/:id/approve
*/

router.patch(
  "/:id/approve",
  approve,
);

/*
PATCH /vendors/:id/reject
*/

router.patch(
  "/:id/reject",
  reject,
);

/*
DELETE /vendors/:id
*/

router.delete(
  "/:id",
  withdraw,
);

export default router;