"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAttendeeTicketEmail = sendAttendeeTicketEmail;
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = require("../../lib/prisma");
const email_service_1 = require("./email.service");
const email_layout_1 = require("./email.layout");
const email_templates_1 = require("./email.templates");
/*
|--------------------------------------------------------------------------
| Send Attendee Ticket Email
|--------------------------------------------------------------------------
|
| This is the single source of truth for attendee ticket emails.
|
| IMPORTANT:
|
| Recipient:
|
| TicketPurchase → User → email
|
| NEVER:
|
| Event → Organization → owner email
|
| This service should only be called after:
|
| 1. Purchase is PAID
| 2. EventPass records have been issued
|
|--------------------------------------------------------------------------
*/
async function sendAttendeeTicketEmail(purchaseId) {
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
            /*
            |--------------------------------------------------------------------------
            | Attendee
            |--------------------------------------------------------------------------
            */
            user: {
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            },
            /*
            |--------------------------------------------------------------------------
            | Event
            |--------------------------------------------------------------------------
            */
            event: {
                select: {
                    id: true,
                    title: true,
                    venue: true,
                    startDate: true,
                    currency: true,
                },
            },
            /*
            |--------------------------------------------------------------------------
            | Ticket
            |--------------------------------------------------------------------------
            */
            ticket: {
                select: {
                    id: true,
                    name: true,
                },
            },
            /*
            |--------------------------------------------------------------------------
            | Event Passes
            |--------------------------------------------------------------------------
            */
            passes: {
                where: {
                    isActive: true,
                    isRevoked: false,
                },
                orderBy: {
                    createdAt: "asc",
                },
                select: {
                    id: true,
                    passNumber: true,
                    qrToken: true,
                },
            },
        },
    });
    /*
    |--------------------------------------------------------------------------
    | Validate Purchase
    |--------------------------------------------------------------------------
    */
    if (!purchase) {
        throw new Error("Purchase not found.");
    }
    /*
    |--------------------------------------------------------------------------
    | Only PAID purchases receive attendee tickets
    |--------------------------------------------------------------------------
    */
    if (purchase.status !==
        "PAID") {
        throw new Error("Attendee ticket email can only be sent for a paid purchase.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Attendee
    |--------------------------------------------------------------------------
    */
    if (!purchase.user) {
        throw new Error("Attendee account not found for this purchase.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Attendee Email
    |--------------------------------------------------------------------------
    */
    const recipient = purchase.user.email
        ?.trim()
        .toLowerCase();
    if (!recipient) {
        throw new Error("Attendee email address not found.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Event
    |--------------------------------------------------------------------------
    */
    if (!purchase.event) {
        throw new Error("Event not found for this purchase.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Ticket
    |--------------------------------------------------------------------------
    */
    if (!purchase.ticket) {
        throw new Error("Ticket type not found for this purchase.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Pass
    |--------------------------------------------------------------------------
    */
    if (!purchase.passes.length) {
        throw new Error("No active ticket pass found for this purchase.");
    }
    /*
    |--------------------------------------------------------------------------
    | Primary Pass
    |--------------------------------------------------------------------------
    |
    | The first active pass is used for the email QR attachment.
    |
    | Every EventPass still retains its own:
    |
    | - passNumber
    | - qrToken
    |
    */
    const primaryPass = purchase.passes[0];
    if (!primaryPass.qrToken) {
        throw new Error("Ticket QR token not found.");
    }
    if (!primaryPass.passNumber) {
        throw new Error("Ticket pass number not found.");
    }
    /*
    |--------------------------------------------------------------------------
    | Generate QR Code
    |--------------------------------------------------------------------------
    |
    | QR content comes directly from the issued EventPass.
    |
    | We do NOT generate the QR from:
    |
    | - purchase ID
    | - ticket type ID
    | - event ID
    |
    */
    const qrBuffer = await qrcode_1.default.toBuffer(primaryPass.qrToken, {
        type: "png",
        width: 900,
        margin: 2,
        errorCorrectionLevel: "H",
    });
    /*
    |--------------------------------------------------------------------------
    | Attendee Name
    |--------------------------------------------------------------------------
    */
    const firstName = purchase.user.firstName
        ?.trim() ||
        "Attendee";
    /*
    |--------------------------------------------------------------------------
    | Build Ticket Email Content
    |--------------------------------------------------------------------------
    |
    | The ticket template remains responsible for the actual ticket content.
    |
    | The centralized email layout is responsible for:
    |
    | - Wowyou EventOS logo
    | - brand name
    | - global styling
    | - footer
    | - support information
    |
    */
    const template = (0, email_templates_1.ticketPurchaseEmailTemplate)({
        firstName,
        eventTitle: purchase.event.title,
        ticketName: purchase.ticket.name,
        quantity: purchase.quantity,
        totalAmount: Number(purchase.amount),
        currency: purchase.currency ||
            purchase.event.currency,
        startDate: purchase.event.startDate,
        venue: purchase.event.venue,
        ticketId: primaryPass.passNumber,
    });
    /*
    |--------------------------------------------------------------------------
    | Apply Centralized Wowyou EventOS Branding
    |--------------------------------------------------------------------------
    */
    const brandedHtml = (0, email_layout_1.renderEmail)(template.html);
    /*
    |--------------------------------------------------------------------------
    | Send Attendee Email
    |--------------------------------------------------------------------------
    |
    | This is explicitly:
    |
    | TICKET_PURCHASE
    |
    | It is completely separate from:
    |
    | ORGANIZER_TICKET_SALE
    |
    */
    return (0, email_service_1.sendEmail)({
        type: "TICKET_PURCHASE",
        /*
        |--------------------------------------------------------------------------
        | CRITICAL:
        |
        | This MUST be the attendee's email.
        |--------------------------------------------------------------------------
        */
        to: recipient,
        subject: template.subject,
        html: brandedHtml,
        ...(template.text
            ? {
                text: template.text,
            }
            : {}),
        /*
        |--------------------------------------------------------------------------
        | Email Delivery Metadata
        |--------------------------------------------------------------------------
        */
        userId: purchase.user.id,
        purchaseId: purchase.id,
        eventId: purchase.event.id,
        /*
        |--------------------------------------------------------------------------
        | QR Attachment
        |--------------------------------------------------------------------------
        */
        attachments: [
            {
                filename: "wowyou-ticket-qr.png",
                content: qrBuffer,
                contentType: "image/png",
                contentId: "wowyou-ticket-qr",
            },
        ],
        /*
        |--------------------------------------------------------------------------
        | Idempotency
        |--------------------------------------------------------------------------
        |
        | Prevents duplicate attendee ticket emails for the same purchase.
        |
        */
        idempotencyKey: `ticket-purchase:${purchase.id}`,
    });
}
