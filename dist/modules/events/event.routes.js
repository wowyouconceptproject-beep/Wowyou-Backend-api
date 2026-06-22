"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const event_controller_1 = require("./event.controller");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.auth, event_controller_1.create);
router.get("/my", auth_middleware_1.auth, event_controller_1.myEvents);
exports.default = router;
