import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  create,
  myTickets,
} from "./purchase.controller";

const router = Router();

router.post(
  "/create",
  auth,
  create
);

router.get(
  "/my",
  auth,
  myTickets
);

export default router;