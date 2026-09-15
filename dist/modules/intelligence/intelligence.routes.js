"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const intelligence_controller_1 = require("./intelligence.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Sentient Pulse
|--------------------------------------------------------------------------
*/
router.get("/events/:eventId/intelligence/pulse", intelligence_controller_1.getPulse);
/*
|--------------------------------------------------------------------------
| Heatmap
|--------------------------------------------------------------------------
*/
router.get("/events/:eventId/intelligence/heatmap", intelligence_controller_1.getHeatmap);
exports.default = router;
