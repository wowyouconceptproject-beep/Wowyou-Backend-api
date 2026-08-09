import {
  Router,
} from "express";

import {
  auth,
} from "../auth/auth.middleware";

import {
  acceptPolicies,
  getConsentStatus,
  getPolicies,
} from "./legal.controller";

const router =
  Router();

/*
|--------------------------------------------------------------------------
| Public Policies
|--------------------------------------------------------------------------
*/

router.get(
  "/policies",
  getPolicies,
);

/*
|--------------------------------------------------------------------------
| Authenticated Consent
|--------------------------------------------------------------------------
*/

router.get(
  "/consent",
  auth,
  getConsentStatus,
);

router.post(
  "/consent",
  auth,
  acceptPolicies,
);

export default router;