import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
  getPass,
  securePass,
} from "./pass.controller";

const router =
  Router();

router.get(
  "/:purchaseId",
  auth,
  getPass
);

router.post(
  "/:purchaseId/secure-pass",
  auth,
  securePass
);

export default router;