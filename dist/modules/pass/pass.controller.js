"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPass = getPass;
exports.securePass = securePass;
exports.verifyPass = verifyPass;
const pass_service_1 = require("./pass.service");
/*
|--------------------------------------------------------------------------
| Get Pass
|--------------------------------------------------------------------------
*/
async function getPass(req, res) {
    try {
        const purchase = await (0, pass_service_1.getEventPass)(req.params.purchaseId, req.user.userId);
        return res.json({
            success: true,
            purchase,
            passes: purchase.passes,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
|--------------------------------------------------------------------------
| Generate Secure Pass
|--------------------------------------------------------------------------
*/
async function securePass(req, res) {
    try {
        const result = await (0, pass_service_1.generateSecurePass)(req.params.purchaseId, req.user.userId);
        return res.json({
            success: true,
            purchase: result.purchase,
            passes: result.passes,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
|--------------------------------------------------------------------------
| Verify Pass
|--------------------------------------------------------------------------
*/
async function verifyPass(req, res) {
    try {
        const result = await (0, pass_service_1.verifySecurePass)(req.body.token);
        return res.json({
            success: true,
            attendee: result.attendee,
            ticket: result.ticket,
            event: result.event,
            pass: {
                id: result.pass.id,
                passNumber: result.pass.passNumber,
                qrToken: result.pass.qrToken,
                nfcToken: result.pass.nfcToken,
                active: result.pass.isActive,
                revoked: result.pass.isRevoked,
                nfcEnabled: result.pass.nfcEnabled,
                issuedAt: result.pass.issuedAt,
                expiresAt: result.pass.expiresAt,
            },
            alreadyCheckedIn: result.alreadyCheckedIn,
            checkedInBy: result.checkedInBy,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
