import { Router } from "express";

import {
  create,
  list,
} from "./ticket.controller";

const router = Router();

router.post(
  "/:eventId",
  create
);

router.get(
  "/:eventId",
  list
);

export default router;