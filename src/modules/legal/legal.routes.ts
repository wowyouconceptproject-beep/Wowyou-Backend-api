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
  acceptCookieConsent,
  getCookieConsentStatus,
  getCookiePolicy,
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

router.get(
  "/cookie-policy",
  getCookiePolicy,
);

/*
|--------------------------------------------------------------------------
| Authenticated Policy Consent
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

/*
|--------------------------------------------------------------------------
| Cookie Consent
|--------------------------------------------------------------------------
|
| POST is intentionally public because visitors can
| consent before creating an account.
|
*/

router.post(
  "/cookie-consent",
  acceptCookieConsent,
);

router.get(
  "/cookie-consent",
  auth,
  getCookieConsentStatus,
);

export default router;