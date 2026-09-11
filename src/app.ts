import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import {
  searchRoutes,
} from "./modules/search";

import revolutRoutes from "./modules/payments/revolut/revolut.routes";

import {
  webhook,
} from "./modules/payments/revolut/revolut.controller";

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
| Revolut Webhook
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Revolut webhook signature verification requires the exact raw request
| body that Revolut signed.
|
| Therefore express.raw() MUST run before express.json().
|
|--------------------------------------------------------------------------
| Primary Webhook Endpoint
|--------------------------------------------------------------------------
|
| POST /api/payments/revolut/webhook
|
| This is the endpoint currently being called by Revolut.
|
*/

app.post(
  "/api/payments/revolut/webhook",
  express.raw({
    type: "application/json",
  }),
  webhook,
);

/*
|--------------------------------------------------------------------------
| Revolut Payment Routes
|--------------------------------------------------------------------------
|
| Existing attendee payment flow.
|
| DO NOT CHANGE.
|
| GET /payments/revolut/return
| GET /payments/revolut/subscription-return
|
*/

app.use(
  "/payments/revolut",
  revolutRoutes,
);

/*
|--------------------------------------------------------------------------
| JSON Parser
|--------------------------------------------------------------------------
|
| Everything below this point receives normal parsed JSON.
|
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

export default app;