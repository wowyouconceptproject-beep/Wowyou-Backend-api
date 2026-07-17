import { Router } from "express";

import {
  search,
  eventSearch,
  suggestions,
} from "./search.controller";

const router = Router();

router.get("/", search);

router.get(
  "/events",
  eventSearch,
);

router.get(
  "/suggestions",
  suggestions,
);

export default router;