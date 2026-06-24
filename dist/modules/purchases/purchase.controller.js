"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
const purchase_service_1 = require("./purchase.service");
async function create(req, res) {
    try {
        const result = await (0, purchase_service_1.createPurchase)(req.user.userId, req.body.ticketTypeId, Number(req.body.quantity));
        return res.status(201).json({
            success: true,
            checkoutUrl: result.checkoutUrl,
            purchase: result.purchase,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
