import { Router } from "express";

import {
  register,
  login,
  me,
} from "./auth.controller";

import {
  auth,
} from "./auth.middleware";

const router = Router();

router.get(
  "/test",
  (_req, res) => {
    res.json({
      success: true,
      message:
        "Auth routes working",
    });
  }
);

router.post(
  "/register",
  register
);

router.post(
  "/login",
  login
);

router.get(
  "/me",
  auth,
  me
);

export default router;