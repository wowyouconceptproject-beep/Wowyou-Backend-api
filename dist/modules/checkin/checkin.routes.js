"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const checkin_controller_1 = require("./checkin.controller");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.auth, checkin_controller_1.checkIn);
exports.default = router;
