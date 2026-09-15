import {
  Router,
} from "express";

const router =
  Router();

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

export default router;