"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const settlement_controller_1 = require("./settlement.controller");
const router = (0, express_1.Router)();
// This endpoint uses SETTLEMENT_JOB_SECRET,
// not browser authentication.
router.post("/run", settlement_controller_1.runSettlementJob);
// Only the authenticated organization owner can view
// the organization's settlement records.
router.get("/organization/:organizationId", auth_middleware_1.auth, settlement_controller_1.organizationSettlementSummary);
exports.default = router;
