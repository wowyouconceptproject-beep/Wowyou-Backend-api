import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  getPass,
  securePass,
  verifyPass,
} from "./pass.controller";

const router = Router();

/*
|--------------------------------------------------------------------------
| Event Pass
|--------------------------------------------------------------------------
*/

router.get(
  "/:purchaseId",
  auth,
  getPass
);

router.post(
  "/:purchaseId/secure-pass",
  auth,
  securePass
);

router.post(
  "/verify",
  auth,
  verifyPass
);

export default router;