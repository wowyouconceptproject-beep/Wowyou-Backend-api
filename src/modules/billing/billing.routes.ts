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
*/

router.post(
  "/checkout",
  auth,
  checkout,
);

export default router;