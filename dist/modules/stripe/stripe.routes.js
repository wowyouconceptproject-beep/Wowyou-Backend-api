"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_controller_1 = require("./stripe.controller");
const router = (0, express_1.Router)();
router.post("/webhook", stripe_controller_1.webhook);
exports.default = router;
