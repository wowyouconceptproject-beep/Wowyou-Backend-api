import { Router } from "express";

import {
  attendeeSettings,
  updateAttendeeSettings,
  organizerSettings,
  updateOrganizerSettings,
  vendorSettings,
  updateVendorSettings,
} from "./settings.controller";

import { auth } from "../../modules/auth/auth.middleware";

const router = Router();

/*
|--------------------------------------------------------------------------
| Attendee
|--------------------------------------------------------------------------
*/

router.get(
  "/attendee",
  auth,
  attendeeSettings,
);

router.put(
  "/attendee",
  auth,
  updateAttendeeSettings,
);

/*
|--------------------------------------------------------------------------
| Organizer
|--------------------------------------------------------------------------
*/

router.get(
  "/organizer",
  auth,
  organizerSettings,
);

router.put(
  "/organizer",
  auth,
  updateOrganizerSettings,
);

/*
|--------------------------------------------------------------------------
| Vendor
|--------------------------------------------------------------------------
*/

router.get(
  "/vendor",
  auth,
  vendorSettings,
);

router.put(
  "/vendor",
  auth,
  updateVendorSettings,
);

export default router;