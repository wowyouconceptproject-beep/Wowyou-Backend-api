"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ops_middleware_1 = require("./ops.middleware");
const announcement_controller_1 = require("./announcement.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| List Announcements
|--------------------------------------------------------------------------
*/
router.get("/", ops_middleware_1.opsAuth, announcement_controller_1.announcements);
/*
|--------------------------------------------------------------------------
| Create Announcement
|--------------------------------------------------------------------------
*/
router.post("/", ops_middleware_1.opsAuth, announcement_controller_1.create);
/*
|--------------------------------------------------------------------------
| Pin / Unpin Announcement
|--------------------------------------------------------------------------
*/
router.patch("/:id/pin", ops_middleware_1.opsAuth, announcement_controller_1.pin);
/*
|--------------------------------------------------------------------------
| Delete Announcement
|--------------------------------------------------------------------------
*/
router.delete("/:id", ops_middleware_1.opsAuth, announcement_controller_1.remove);
exports.default = router;
