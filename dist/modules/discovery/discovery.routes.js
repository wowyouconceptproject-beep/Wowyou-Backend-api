"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const discovery_controller_1 = require("./discovery.controller");
const router = (0, express_1.Router)();
router.get("/", discovery_controller_1.discovery);
exports.default = router;
