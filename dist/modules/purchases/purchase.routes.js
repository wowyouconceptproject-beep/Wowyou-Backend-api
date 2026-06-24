"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const purchase_controller_1 = require("./purchase.controller");
const router = (0, express_1.Router)();
router.post("/create", auth_middleware_1.auth, purchase_controller_1.create);
exports.default = router;
