"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const revenue_controller_1 = require("./revenue.controller");
const router = (0, express_1.Router)();
router.get("/event/:eventId", revenue_controller_1.eventRevenue);
exports.default = router;
