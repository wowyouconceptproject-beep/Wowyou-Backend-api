import {
  Router,
} from "express";

import {
  webhook,
} from "./revolut.controller";

import {
  paymentReturn,
  subscriptionReturn,
} from "./revolut-return.controller";

const router =
  Router();

/*
|--------------------------------------------------------------------------
| Revolut Webhook
|--------------------------------------------------------------------------
|
| NO authentication middleware here.
|
| Revolut authenticates itself using the signed webhook.
|
*/

router.post(
  "/webhook",
  webhook,
);

/*
|--------------------------------------------------------------------------
| Attendee Payment Return
|--------------------------------------------------------------------------
|
| Existing attendee payment flow.
| DO NOT CHANGE.
|
*/

router.get(
  "/return",
  paymentReturn,
);

/*
|--------------------------------------------------------------------------
| Organizer Subscription Return
|--------------------------------------------------------------------------
|
| Separate from attendee ticket payments.
|
| This endpoint does NOT activate the subscription.
| Activation remains webhook-driven.
|
*/

router.get(
  "/subscription-return",
  subscriptionReturn,
);

export default router;