"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const legal_controller_1 = require("./legal.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Public Policies
|--------------------------------------------------------------------------
*/
router.get("/policies", legal_controller_1.getPolicies);
router.get("/cookie-policy", legal_controller_1.getCookiePolicy);
/*
|--------------------------------------------------------------------------
| Authenticated Policy Consent
|--------------------------------------------------------------------------
*/
router.get("/consent", auth_middleware_1.auth, legal_controller_1.getConsentStatus);
router.post("/consent", auth_middleware_1.auth, legal_controller_1.acceptPolicies);
/*
|--------------------------------------------------------------------------
| Cookie Consent
|--------------------------------------------------------------------------
|
| POST is intentionally public because visitors can
| consent before creating an account.
|
*/
router.post("/cookie-consent", legal_controller_1.acceptCookieConsent);
router.get("/cookie-consent", auth_middleware_1.auth, legal_controller_1.getCookieConsentStatus);
exports.default = router;
