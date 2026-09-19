"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("./auth.middleware");
const router = (0, express_1.Router)();
router.get("/test", (_req, res) => {
    res.json({
        success: true,
        message: "Auth routes working",
    });
});
router.post("/register", auth_controller_1.register);
router.post("/login", auth_controller_1.login);
router.post("/verify-login-otp", auth_controller_1.verifyLoginCode);
router.post("/resend-login-otp", auth_controller_1.resendLoginCode);
router.get("/verify-email", auth_controller_1.verifyEmail);
router.post("/resend-verification", auth_controller_1.resendVerification);
router.get("/me", auth_middleware_1.auth, auth_controller_1.me);
exports.default = router;
