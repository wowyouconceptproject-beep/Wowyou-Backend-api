"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSettlementJob = runSettlementJob;
exports.organizationSettlementSummary = organizationSettlementSummary;
const crypto_1 = require("crypto");
const settlement_service_1 = require("./settlement.service");
function validJobSecret(received, expected) {
    if (!received || !expected) {
        return false;
    }
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    return (a.length === b.length &&
        (0, crypto_1.timingSafeEqual)(a, b));
}
async function runSettlementJob(req, res) {
    const expected = process.env.SETTLEMENT_JOB_SECRET?.trim();
    const header = req.header("authorization") ?? "";
    const received = header.startsWith("Bearer ")
        ? header.slice(7).trim()
        : "";
    if (!validJobSecret(received, expected)) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized settlement job request.",
        });
    }
    try {
        const result = await (0, settlement_service_1.processEligibleSettlements)();
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("Settlement job failed:", error);
        return res.status(500).json({
            success: false,
            message: "Settlement job failed.",
        });
    }
}
async function organizationSettlementSummary(req, res) {
    const ownerId = req.user?.userId;
    if (!ownerId) {
        return res.status(401).json({
            success: false,
            message: "Authentication required.",
        });
    }
    const organizationId = String(req.params.organizationId ?? "").trim();
    if (!organizationId) {
        return res.status(400).json({
            success: false,
            message: "Organization ID is required.",
        });
    }
    try {
        const summary = await (0, settlement_service_1.getOrganizationSettlementSummary)(organizationId, ownerId);
        if (!summary) {
            return res.status(404).json({
                success: false,
                message: "Organization not found.",
            });
        }
        return res.json({
            success: true,
            ...summary,
        });
    }
    catch (error) {
        console.error("Organizer settlement summary error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load settlement summary.",
        });
    }
}
