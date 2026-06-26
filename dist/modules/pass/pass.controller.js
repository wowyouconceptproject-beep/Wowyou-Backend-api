"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPass = getPass;
exports.securePass = securePass;
const pass_service_1 = require("./pass.service");
async function getPass(req, res) {
    try {
        const pass = await (0, pass_service_1.getEventPass)(req.params.purchaseId, req.user.userId);
        return res.json({
            success: true,
            pass,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
async function securePass(req, res) {
    try {
        const result = await (0, pass_service_1.generateSecurePass)(req.params.purchaseId, req.user.userId);
        return res.json({
            success: true,
            token: result.token,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
