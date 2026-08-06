"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../auth/auth.middleware");
const capacity_controller_1 = require("./capacity.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Capacity
|--------------------------------------------------------------------------
*/
router.get("/:eventId", auth_middleware_1.auth, capacity_controller_1.capacity);
exports.default = router;
