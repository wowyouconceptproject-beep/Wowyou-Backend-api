import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import {
  searchRoutes,
} from "./modules/search";

import stripeRoutes
  from "./modules/payments/stripe/stripe.routes";

import intelligenceRoutes
  from "./modules/intelligence/intelligence.routes";

const app = express();

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.use(
  helmet(),
);

/*
|--------------------------------------------------------------------------
| Logging
|--------------------------------------------------------------------------
*/

app.use(
  morgan("dev"),
);

/*
|--------------------------------------------------------------------------
| Stripe Webhook
|--------------------------------------------------------------------------
|
| Stripe signature verification requires the ORIGINAL raw request body.
|
| IMPORTANT:
| This MUST be registered BEFORE express.json().
|
| Endpoint:
|
| POST /api/stripe/webhook
|
*/

app.post(
  "/api/stripe/webhook",
  express.raw({
    type: "application/json",
  }),
  async (req, res, next) => {
    try {
      const {
        webhook,
      } = await import(
        "./modules/payments/stripe/stripe.controller"
      );

      return webhook(
        req,
        res,
      );
    } catch (error) {
      return next(error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| JSON Parser
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "10mb",
  }),
);

/*
|--------------------------------------------------------------------------
| Search
|--------------------------------------------------------------------------
*/

app.use(
  "/search",
  searchRoutes,
);

/*
|--------------------------------------------------------------------------
| Stripe Routes
|--------------------------------------------------------------------------
|
| /api/stripe/...
|
| The webhook is handled above because Stripe requires
| the raw request body for signature verification.
|
*/

app.use(
  "/api/stripe",
  stripeRoutes,
);

/*
|--------------------------------------------------------------------------
| Event Intelligence
|--------------------------------------------------------------------------
*/

app.use(
  "/api",
  intelligenceRoutes,
);

export default app;