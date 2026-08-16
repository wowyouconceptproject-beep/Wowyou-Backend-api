import {
  Router,
} from "express";

import {
  auth,
} from "../auth/auth.middleware";

import {
  plans,
  subscription,
  checkout,
} from "./billing.controller";

const router =
  Router();

/*
|--------------------------------------------------------------------------
| Public Plan Catalog
|--------------------------------------------------------------------------
*/

router.get(
  "/plans",
  plans,
);

/*
|--------------------------------------------------------------------------
| Current Organization Subscription
|--------------------------------------------------------------------------
*/

router.get(
  "/subscription",
  auth,
  subscription,
);

/*
|--------------------------------------------------------------------------
| Checkout
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Do NOT require an active subscription here.
| An organizer without a subscription must be able to purchase one.
|
*/

router.post(
  "/checkout",
  auth,
  checkout,
);

export default router;