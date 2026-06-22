"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const organization_controller_1 = require("./organization.controller");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.auth, organization_controller_1.create);
router.get("/me", auth_middleware_1.auth, organization_controller_1.me);
exports.default = router;
