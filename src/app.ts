import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import {
  searchRoutes,
} from "./modules/search";

import revolutRoutes from "./modules/payments/revolut/revolut.routes";

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
| This MUST be registered before express.json().
|
| Revolut webhook signature verification requires the exact raw request
| body that Revolut signed.
|
| Final endpoint:
|
| POST /payments/revolut/webhook
|
*/

app.use(
  "/payments/revolut",
  express.raw({
    type: "application/json",
  }),
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