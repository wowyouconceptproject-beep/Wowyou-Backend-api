"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const billing_controller_1 = require("./billing.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Public Plan Catalog
|--------------------------------------------------------------------------
*/
router.get("/plans", billing_controller_1.plans);
/*
|--------------------------------------------------------------------------
| Current Organization Subscription
|--------------------------------------------------------------------------
*/
router.get("/subscription", auth_middleware_1.auth, billing_controller_1.subscription);
/*
|--------------------------------------------------------------------------
| Checkout
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Do NOT require an active subscription here.
| An organizer without a subscription must be able to purchase one.
|
*/
router.post("/checkout", auth_middleware_1.auth, billing_controller_1.checkout);
exports.default = router;
