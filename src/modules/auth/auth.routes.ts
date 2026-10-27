
import { Router } from "express";

import {
  register,
  login,
  me,
  verifyEmail,
  resendVerification,
  verifyLoginCode,
  resendLoginCode,
  forgotPassword,
  verifyResetCode,
  resetPasswordController,
  logout,
} from "./auth.controller";

import { auth } from "./auth.middleware";

const router = Router();

router.get("/test", (_req, res) => {
  res.json({
    success: true,
    message: "Auth routes working",
  });
});

router.post("/register", register);
router.post("/login", login);
router.post("/verify-login-otp", verifyLoginCode);
router.post("/resend-login-otp", resendLoginCode);

router.post("/logout", logout);

router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPasswordController);

router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

router.get("/me", auth, me);

export default router;
