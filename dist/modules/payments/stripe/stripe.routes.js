"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Stripe Routes
|--------------------------------------------------------------------------
|
| The Stripe webhook is intentionally NOT registered here.
|
| It is registered directly in app.ts because Stripe requires the
| ORIGINAL raw request body for signature verification.
|
| Webhook:
|
| POST /api/stripe/webhook
|
|--------------------------------------------------------------------------
*/
/*
|--------------------------------------------------------------------------
| Future Stripe Routes
|--------------------------------------------------------------------------
|
| Examples:
|
| POST /api/stripe/connect/account
| GET  /api/stripe/connect/status
| POST /api/stripe/subscription
| POST /api/stripe/refund
|
| Add them here as the Stripe platform functionality grows.
|
|--------------------------------------------------------------------------
*/
exports.default = router;
