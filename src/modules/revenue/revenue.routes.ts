import { Router } from "express";

import {
  eventRevenue,
} from "./revenue.controller";

const router = Router();

router.get(
  "/event/:eventId",
  eventRevenue
);

export default router;