import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  getPass,
  securePass,
  verifyPass,
  checkIn,
} from "./pass.controller";

const router =
  Router();

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

router.post(
  "/check-in",
  auth,
  checkIn
);

export default router;