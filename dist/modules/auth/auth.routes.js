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
router.get("/me", auth_middleware_1.auth, auth_controller_1.me);
exports.default = router;
