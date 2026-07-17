import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  create,
  myTickets,
  myEvents,
  getMyEvent,
} from "./purchase.controller";

const router = Router();

/*
|--------------------------------------------------------------------------
| Purchase Ticket
|--------------------------------------------------------------------------
*/

router.post(
  "/create",
  auth,
  create,
);

/*
|--------------------------------------------------------------------------
| Legacy
|--------------------------------------------------------------------------
|
| Existing endpoint used by the current
| web and mobile implementation.
| Leave untouched.
|
*/

router.get(
  "/my",
  auth,
  myTickets,
);

/*
|--------------------------------------------------------------------------
| My Events (Attendee App)
|--------------------------------------------------------------------------
*/

router.get(
  "/my-events",
  auth,
  myEvents,
);

/*
|--------------------------------------------------------------------------
| Event Hub
|--------------------------------------------------------------------------
*/

router.get(
  "/my-events/:purchaseId",
  auth,
  getMyEvent,
);

export default router;