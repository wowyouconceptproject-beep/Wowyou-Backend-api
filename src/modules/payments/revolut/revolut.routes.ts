import {
  Router,
} from "express";

import {
  webhook,
} from "./revolut.controller";

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

export default router;