import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  createAccount,
  onboarding,
  status,
  dashboard,
} from "./stripe-connect.controller";

const router = Router();

/*
|--------------------------------------------------------------------------
| Stripe Connect
|--------------------------------------------------------------------------
*/

router.post(
  "/connect/account",
  auth,
  createAccount,
);

router.post(
  "/connect/onboarding",
  auth,
  onboarding,
);

router.get(
  "/connect/status/:organizationId",
  auth,
  status,
);

router.get(
  "/connect/dashboard/:organizationId",
  auth,
  dashboard,
);

export default router;