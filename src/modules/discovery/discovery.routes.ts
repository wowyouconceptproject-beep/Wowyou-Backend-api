import { Router } from "express";

import {
  discovery,
} from "./discovery.controller";

const router =
  Router();

router.get(
  "/",
  discovery,
);

export default router;