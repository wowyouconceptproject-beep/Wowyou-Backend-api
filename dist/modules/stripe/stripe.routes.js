"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const stripe_connect_controller_1 = require("./stripe-connect.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Stripe Connect
|--------------------------------------------------------------------------
*/
router.post("/connect/account", auth_middleware_1.auth, stripe_connect_controller_1.createAccount);
router.post("/connect/onboarding", auth_middleware_1.auth, stripe_connect_controller_1.onboarding);
router.get("/connect/status/:organizationId", auth_middleware_1.auth, stripe_connect_controller_1.status);
router.get("/connect/dashboard/:organizationId", auth_middleware_1.auth, stripe_connect_controller_1.dashboard);
exports.default = router;
