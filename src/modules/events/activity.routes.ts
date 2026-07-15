import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  activity,
} from "./activity.controller";

const router = Router();

/*
|--------------------------------------------------------------------------
| Event Activity
|--------------------------------------------------------------------------
*/

router.get(
  "/:eventId/activity",
  auth,
  activity,
);

export default router;