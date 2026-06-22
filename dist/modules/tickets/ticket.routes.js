"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ticket_controller_1 = require("./ticket.controller");
const router = (0, express_1.Router)();
router.post("/:eventId", ticket_controller_1.create);
router.get("/:eventId", ticket_controller_1.list);
exports.default = router;
