import { Router } from "express";

import {
  webhook,
} from "./stripe.controller";

const router = Router();

router.post(
  "/webhook",
  webhook
);

export default router;