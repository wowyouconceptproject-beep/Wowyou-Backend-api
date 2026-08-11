import {
  Router,
} from "express";

import {
  webhook,
} from "./revolut.controller";

import {
  paymentReturn,
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
| Payment Return
|--------------------------------------------------------------------------
|
| Revolut redirects the customer here after checkout.
|
*/

router.get(
  "/return",
  paymentReturn,
);

export default router;