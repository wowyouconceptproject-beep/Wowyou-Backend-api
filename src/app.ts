import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import {
  searchRoutes,
} from "./modules/search";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  "/search",
  searchRoutes,
);

app.use(helmet());

app.use(morgan("dev"));

app.use(
  "/stripe/webhook",
  express.raw({
    type:
      "application/json",
  })
);

app.use(express.json());

export default app;