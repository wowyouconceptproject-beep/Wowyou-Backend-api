import {
  Router,
} from "express";

import {
  auth,
} from "../auth/auth.middleware";

import {
  checkIn,
} from "./checkin.controller";

const router =
  Router();

router.post(
  "/",
  auth,
  checkIn,
);

export default router;