"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issuePurchase = issuePurchase;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../lib/prisma");
/*
|--------------------------------------------------------------------------
| Pass Number
|--------------------------------------------------------------------------
*/
function generatePassNumber() {
    return `WY-${crypto_1.default
        .randomBytes(5)
        .toString("hex")
        .toUpperCase()}`;
}
/*
|--------------------------------------------------------------------------
| QR Token
|--------------------------------------------------------------------------
*/
function generateQrToken() {
    return crypto_1.default
        .randomBytes(32)
        .toString("hex");
}
/*
|--------------------------------------------------------------------------
| NFC Token
|--------------------------------------------------------------------------
*/
function generateNfcToken() {
    return crypto_1.default
        .randomBytes(32)
        .toString("hex");
}
/*
|--------------------------------------------------------------------------
| Issue Purchase
|--------------------------------------------------------------------------
|
| Single source of truth for issuing attendee passes.
|
| Responsibilities:
|
| • Create EventPass records
| • Generate Pass Number
| • Generate QR Token
| • Generate NFC Token
| • Record PASS_ISSUED activity
|
| NOT responsible for:
|
| • Payment processing
| • Inventory reservation
| • Purchase status updates
|
*/
async function issuePurchase(purchaseId) {
    /*
    |--------------------------------------------------------------------------
    | Purchase
    |--------------------------------------------------------------------------
    */
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: purchaseId,
        },
        include: {
            user: true,
            event: true,
            ticket: true,
            passes: true,
        },
    });
    if (!purchase) {
        throw new Error("Purchase not found.");
    }
    /*
    |--------------------------------------------------------------------------
    | Purchase Status
    |--------------------------------------------------------------------------
    */
    if (purchase.status !==
        "PAID") {
        throw new Error("Purchase has not been paid.");
    }
    /*
    |--------------------------------------------------------------------------
    | Idempotency
    |--------------------------------------------------------------------------
    */
    if (purchase.passes.length > 0) {
        return purchase.passes;
    }
    /*
    |--------------------------------------------------------------------------
    | Transaction
    |--------------------------------------------------------------------------
    */
    return prisma_1.prisma.$transaction(async (tx) => {
        /*
        |--------------------------------------------------------------------------
        | Create Event Passes
        |--------------------------------------------------------------------------
        */
        const passes = [];
        for (let i = 0; i < purchase.quantity; i++) {
            const pass = await tx.eventPass.create({
                data: {
                    purchaseId: purchase.id,
                    passNumber: generatePassNumber(),
                    qrToken: generateQrToken(),
                    nfcToken: generateNfcToken(),
                    isActive: true,
                    isRevoked: false,
                    nfcEnabled: true,
                    issuedAt: new Date(),
                },
            });
            passes.push(pass);
        }
        /*
        |--------------------------------------------------------------------------
        | Activity
        |--------------------------------------------------------------------------
        */
        await tx.eventActivity.create({
            data: {
                eventId: purchase.eventId,
                purchaseId: purchase.id,
                type: "PASS_ISSUED",
                title: "Ticket Issued",
                description: `${purchase.quantity} pass${purchase.quantity === 1 ? "" : "es"} issued.`,
                payload: {
                    paymentProvider: purchase.paymentProvider,
                    quantity: purchase.quantity,
                    ticketType: purchase.ticket.name,
                },
            },
        });
        return passes;
    });
}
