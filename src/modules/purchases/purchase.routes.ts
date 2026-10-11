import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  quote,
  create,
  myTickets,
  myEvents,
  getMyEvent,
  paymentStatus,
   manualSale,
} from "./purchase.controller";

const router = Router();

/*
|--------------------------------------------------------------------------
| Purchase Quote
|--------------------------------------------------------------------------
|
| POST /quote
|
| Returns the server-calculated:
| - Ticket subtotal
| - Transaction fee
| - Total payable
|
| Requires authentication.
| Does not create a purchase or reserve inventory.
|
*/

router.post(
  "/quote",
  auth,
  quote,
);

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
| Payment Status
|--------------------------------------------------------------------------
*/

router.get(
  "/:purchaseId/status",
  auth,
  paymentStatus,
);

/*
|--------------------------------------------------------------------------
| Legacy
|--------------------------------------------------------------------------
|
| Existing endpoint used by the current web and mobile implementation.
| Leave the endpoint unchanged.
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

/*
|--------------------------------------------------------------------------
| Organizer Manual / Offline Ticket Sale
|--------------------------------------------------------------------------
*/

router.post(
  "/manual-sale",
  auth,
  manualSale,
);

export default router;