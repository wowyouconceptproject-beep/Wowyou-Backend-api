"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issuePurchase = issuePurchase;
const crypto_1 = __importDefault(require("crypto"));
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = require("../../lib/prisma");
const email_service_1 = require("../email/email.service");
const email_templates_1 = require("../email/email.templates");
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
| Send Ticket Purchase Email
|--------------------------------------------------------------------------
*/
async function sendTicketPurchaseEmail(purchaseId) {
    /*
    |--------------------------------------------------------------------------
    | Check Existing Delivery
    |--------------------------------------------------------------------------
    */
    const existingDelivery = await prisma_1.prisma.emailDelivery.findFirst({
        where: {
            purchaseId,
            type: "TICKET_PURCHASE",
            status: "SENT",
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    if (existingDelivery) {
        return {
            success: true,
            alreadySent: true,
            messageId: existingDelivery.providerMessageId ??
                undefined,
        };
    }
    /*
    |--------------------------------------------------------------------------
    | Load Purchase
    |--------------------------------------------------------------------------
    */
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: purchaseId,
        },
        include: {
            user: true,
            event: {
                include: {
                    organization: {
                        include: {
                            owner: true,
                        },
                    },
                },
            },
            ticket: true,
            passes: {
                where: {
                    isActive: true,
                    isRevoked: false,
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
        },
    });
    if (!purchase) {
        throw new Error("Purchase not found while sending ticket email.");
    }
    if (purchase.status !==
        "PAID") {
        throw new Error("Cannot send ticket email for an unpaid purchase.");
    }
    if (purchase.passes.length ===
        0) {
        throw new Error("Cannot send ticket email because no passes have been issued.");
    }
    /*
    |--------------------------------------------------------------------------
    | Primary Pass
    |--------------------------------------------------------------------------
    */
    const primaryPass = purchase.passes[0];
    /*
    |--------------------------------------------------------------------------
    | Generate QR Image
    |--------------------------------------------------------------------------
    */
    const qrBuffer = await qrcode_1.default.toBuffer(primaryPass.qrToken, {
        type: "png",
        width: 600,
        margin: 2,
        errorCorrectionLevel: "M",
    });
    /*
    |--------------------------------------------------------------------------
    | Build Email
    |--------------------------------------------------------------------------
    */
    const firstName = purchase.user.firstName?.trim() ||
        "there";
    const template = (0, email_templates_1.ticketPurchaseEmailTemplate)({
        firstName,
        eventTitle: purchase.event.title,
        ticketName: purchase.ticket.name,
        quantity: purchase.quantity,
        totalAmount: purchase.amount,
        currency: purchase.currency,
        startDate: purchase.event.startDate,
        venue: purchase.event.venue,
        ticketId: primaryPass.passNumber,
    });
    /*
    |--------------------------------------------------------------------------
    | Send Email
    |--------------------------------------------------------------------------
    */
    return (0, email_service_1.sendEmail)({
        type: "TICKET_PURCHASE",
        to: purchase.user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        userId: purchase.userId,
        purchaseId: purchase.id,
        eventId: purchase.eventId,
        attachments: [
            {
                filename: "wowyou-ticket-qr.png",
                content: qrBuffer,
                contentType: "image/png",
                contentId: "wowyou-ticket-qr",
            },
        ],
        idempotencyKey: `ticket_purchase_${purchase.id}`,
    });
}
/*
|--------------------------------------------------------------------------
| Send Organizer Ticket Sale Email
|--------------------------------------------------------------------------
*/
async function sendOrganizerTicketSaleEmail(purchaseId) {
    /*
    |--------------------------------------------------------------------------
    | Check Existing Delivery
    |--------------------------------------------------------------------------
    */
    const existingDelivery = await prisma_1.prisma.emailDelivery.findFirst({
        where: {
            purchaseId,
            type: "ORGANIZER_TICKET_SALE",
            status: "SENT",
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    if (existingDelivery) {
        return {
            success: true,
            alreadySent: true,
            messageId: existingDelivery.providerMessageId ??
                undefined,
        };
    }
    /*
    |--------------------------------------------------------------------------
    | Load Purchase
    |--------------------------------------------------------------------------
    */
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: purchaseId,
        },
        include: {
            user: true,
            event: {
                include: {
                    organization: {
                        include: {
                            owner: true,
                        },
                    },
                },
            },
            ticket: true,
        },
    });
    if (!purchase) {
        throw new Error("Purchase not found while sending organizer sale email.");
    }
    if (purchase.status !==
        "PAID") {
        throw new Error("Cannot send organizer sale email for an unpaid purchase.");
    }
    /*
    |--------------------------------------------------------------------------
    | Organizer
    |--------------------------------------------------------------------------
    */
    const organization = purchase.event.organization;
    const organizer = organization.owner;
    if (!organizer?.email) {
        throw new Error("Organization owner email not found.");
    }
    /*
    |--------------------------------------------------------------------------
    | Build Email
    |--------------------------------------------------------------------------
    */
    const buyerName = `${purchase.user.firstName} ${purchase.user.lastName}`
        .trim();
    const template = (0, email_templates_1.organizerTicketSaleEmailTemplate)({
        organizationName: organization.name,
        eventTitle: purchase.event.title,
        ticketName: purchase.ticket.name,
        quantity: purchase.quantity,
        totalAmount: purchase.amount,
        currency: purchase.currency,
        buyerName: buyerName ||
            "Attendee",
        buyerEmail: purchase.user.email,
    });
    /*
    |--------------------------------------------------------------------------
    | Send Email
    |--------------------------------------------------------------------------
    */
    return (0, email_service_1.sendEmail)({
        type: "ORGANIZER_TICKET_SALE",
        to: organizer.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        userId: organizer.id,
        purchaseId: purchase.id,
        eventId: purchase.eventId,
        idempotencyKey: `organizer_ticket_sale_${purchase.id}`,
    });
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
| • Verify purchase is paid
| • Create EventPass records
| • Generate Pass Number
| • Generate QR Token
| • Generate NFC Token
| • Record PASS_ISSUED activity
| • Send attendee ticket email
| • Send organizer sale email
|
| NOT responsible for:
|
| • Payment processing
| • Inventory reservation
| • Purchase status updates
|
|--------------------------------------------------------------------------
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
    | Fast Idempotency
    |--------------------------------------------------------------------------
    |
    | If passes already exist, do not create them again.
    |
    | We still run the email functions because a previous attempt may have
    | created the passes but failed to deliver one or both emails.
    |
    |--------------------------------------------------------------------------
    */
    if (purchase.passes.length >
        0) {
        try {
            await sendTicketPurchaseEmail(purchaseId);
        }
        catch (error) {
            console.error("Failed to send attendee ticket email:", error);
        }
        try {
            await sendOrganizerTicketSaleEmail(purchaseId);
        }
        catch (error) {
            console.error("Failed to send organizer ticket sale email:", error);
        }
        return purchase.passes;
    }
    /*
    |--------------------------------------------------------------------------
    | Transaction
    |--------------------------------------------------------------------------
    */
    const passes = await prisma_1.prisma.$transaction(async (tx) => {
        /*
        |--------------------------------------------------------------------------
        | Lock Purchase Row
        |--------------------------------------------------------------------------
        */
        await tx.$queryRaw `
          SELECT id
          FROM "TicketPurchase"
          WHERE id = ${purchaseId}
          FOR UPDATE
        `;
        /*
        |--------------------------------------------------------------------------
        | Re-fetch Purchase State
        |--------------------------------------------------------------------------
        */
        const lockedPurchase = await tx.ticketPurchase.findUnique({
            where: {
                id: purchaseId,
            },
            include: {
                event: true,
                ticket: true,
                passes: true,
            },
        });
        if (!lockedPurchase) {
            throw new Error("Purchase not found.");
        }
        /*
        |--------------------------------------------------------------------------
        | Verify Paid State
        |--------------------------------------------------------------------------
        */
        if (lockedPurchase.status !==
            "PAID") {
            throw new Error("Purchase has not been paid.");
        }
        /*
        |--------------------------------------------------------------------------
        | Idempotency After Lock
        |--------------------------------------------------------------------------
        */
        if (lockedPurchase.passes.length >
            0) {
            return lockedPurchase.passes;
        }
        /*
        |--------------------------------------------------------------------------
        | Create Event Passes
        |--------------------------------------------------------------------------
        */
        const createdPasses = [];
        for (let i = 0; i <
            lockedPurchase.quantity; i++) {
            const pass = await tx.eventPass.create({
                data: {
                    purchaseId: lockedPurchase.id,
                    passNumber: generatePassNumber(),
                    qrToken: generateQrToken(),
                    nfcToken: generateNfcToken(),
                    isActive: true,
                    isRevoked: false,
                    nfcEnabled: true,
                    issuedAt: new Date(),
                },
            });
            createdPasses.push(pass);
        }
        /*
        |--------------------------------------------------------------------------
        | Activity
        |--------------------------------------------------------------------------
        */
        await tx.eventActivity.create({
            data: {
                eventId: lockedPurchase.eventId,
                purchaseId: lockedPurchase.id,
                type: "PASS_ISSUED",
                title: "Ticket Issued",
                description: `${lockedPurchase.quantity} pass${lockedPurchase.quantity === 1
                    ? ""
                    : "es"} issued.`,
                payload: {
                    paymentProvider: lockedPurchase.paymentProvider,
                    quantity: lockedPurchase.quantity,
                    ticketType: lockedPurchase.ticket.name,
                },
            },
        });
        return createdPasses;
    });
    /*
    |--------------------------------------------------------------------------
    | Post-Transaction Emails
    |--------------------------------------------------------------------------
    |
    | These intentionally execute after the transaction has committed.
    |
    | Email failure must never invalidate an already-issued ticket.
    |
    |--------------------------------------------------------------------------
    */
    try {
        await sendTicketPurchaseEmail(purchaseId);
    }
    catch (error) {
        console.error("Failed to send attendee ticket email:", error);
    }
    try {
        await sendOrganizerTicketSaleEmail(purchaseId);
    }
    catch (error) {
        console.error("Failed to send organizer ticket sale email:", error);
    }
    /*
    |--------------------------------------------------------------------------
    | Return Passes
    |--------------------------------------------------------------------------
    */
    return passes;
}
