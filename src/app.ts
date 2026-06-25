import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
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