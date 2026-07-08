"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventPass = getEventPass;
exports.generateSecurePass = generateSecurePass;
exports.verifySecurePass = verifySecurePass;
const prisma_1 = require("../../lib/prisma");
const pass_jwt_1 = require("./pass.jwt");
/*
|--------------------------------------------------------------------------
| Get Event Pass
|--------------------------------------------------------------------------
*/
async function getEventPass(purchaseId, userId) {
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: purchaseId,
        },
        include: {
            user: true,
            event: true,
            ticket: true,
        },
    });
    if (!purchase) {
        throw new Error("Pass not found.");
    }
    if (purchase.userId !== userId) {
        throw new Error("Unauthorized.");
    }
    return purchase;
}
/*
|--------------------------------------------------------------------------
| Generate Secure Pass
|--------------------------------------------------------------------------
*/
async function generateSecurePass(purchaseId, userId) {
    const purchase = await getEventPass(purchaseId, userId);
    if (purchase.status !== "PAID") {
        throw new Error("Ticket has not been paid for.");
    }
    if (purchase.checkedIn) {
        throw new Error("This pass has already been used.");
    }
    if (purchase.event.endDate <
        new Date()) {
        throw new Error("Event has ended.");
    }
    const token = (0, pass_jwt_1.generatePassToken)({
        purchaseId: purchase.id,
        eventId: purchase.eventId,
        userId: purchase.userId,
    });
    return {
        token,
    };
}
/*
|--------------------------------------------------------------------------
| Verify Secure Pass
|--------------------------------------------------------------------------
*/
async function verifySecurePass(token) {
    const payload = (0, pass_jwt_1.verifyPassToken)(token);
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: payload.purchaseId,
        },
        include: {
            user: true,
            event: true,
            ticket: true,
            checkIn: {
                include: {
                    staff: true,
                },
            },
        },
    });
    if (!purchase) {
        throw new Error("Pass not found.");
    }
    if (purchase.status !== "PAID") {
        throw new Error("Ticket has not been paid.");
    }
    return {
        purchase,
        alreadyCheckedIn: purchase.checkedIn,
        checkedInBy: purchase.checkIn
            ? {
                id: purchase.checkIn.staff.id,
                name: purchase.checkIn.staff.name,
                station: purchase.checkIn.station,
                checkedInAt: purchase.checkIn.checkedInAt,
            }
            : null,
    };
}
