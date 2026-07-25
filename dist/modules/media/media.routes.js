"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const media_controller_1 = require("./media.controller");
const media_middleware_1 = require("./media.middleware");
const router = (0, express_1.Router)();
router.post("/event-cover", auth_middleware_1.auth, media_middleware_1.uploadEventCover.single("image"), media_controller_1.uploadEventCover);
exports.default = router;
