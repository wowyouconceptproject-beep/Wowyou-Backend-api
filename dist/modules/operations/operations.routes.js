"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const operations_controller_1 = require("./operations.controller");
const router = (0, express_1.Router)();
router.get("/events", auth_middleware_1.auth, operations_controller_1.myEvents);
exports.default = router;
