import {
  Router,
} from "express";

import {
  auth,
} from "../../auth/auth.middleware";

import {
  capacity,
} from "./capacity.controller";

const router =
  Router();

/*
|--------------------------------------------------------------------------
| Capacity
|--------------------------------------------------------------------------
*/

router.get(
  "/:eventId",
  auth,
  capacity,
);

export default router;