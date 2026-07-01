"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const staff_controller_1 = require("./staff.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Staff
|--------------------------------------------------------------------------
*/
router.post("/:eventId/staff", auth_middleware_1.auth, staff_controller_1.create);
router.get("/:eventId/staff", auth_middleware_1.auth, staff_controller_1.list);
router.get("/staff/:staffId", auth_middleware_1.auth, staff_controller_1.get);
router.post("/staff/:staffId/regenerate", auth_middleware_1.auth, staff_controller_1.regenerate);
router.patch("/staff/:staffId/disable", auth_middleware_1.auth, staff_controller_1.disable);
exports.default = router;
