"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const resend_1 = require("resend");
const prisma_1 = require("../../lib/prisma");
const email_helpers_1 = require("./email.helpers");
let resendClient = null;
/*
|--------------------------------------------------------------------------
| Resend Client
|--------------------------------------------------------------------------
*/
function getResend() {
    if (!resendClient) {
        resendClient = new resend_1.Resend((0, email_helpers_1.getRequiredEnv)("RESEND_API_KEY"));
    }
    return resendClient;
}
/*
|--------------------------------------------------------------------------
| Email Configuration
|--------------------------------------------------------------------------
*/
function getFromAddress() {
    return (0, email_helpers_1.getRequiredEnv)("EMAIL_FROM");
}
function getReplyTo() {
    return (process.env.EMAIL_REPLY_TO?.trim() ||
        undefined);
}
/*
|--------------------------------------------------------------------------
| Send Email
|--------------------------------------------------------------------------
*/
async function sendEmail(input) {
    const recipient = input.to.trim().toLowerCase();
    /*
    |--------------------------------------------------------------------------
    | Validate Input
    |--------------------------------------------------------------------------
    */
    if (!recipient) {
        throw new Error("Email recipient is required.");
    }
    if (!input.subject.trim()) {
        throw new Error("Email subject is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Create Email Delivery Record
    |--------------------------------------------------------------------------
    */
    const delivery = await prisma_1.prisma.emailDelivery.create({
        data: {
            type: input.type,
            recipient,
            userId: input.userId,
            purchaseId: input.purchaseId,
            eventId: input.eventId,
            provider: "RESEND",
            status: "PENDING",
        },
    });
    /*
    |--------------------------------------------------------------------------
    | Send Through Resend
    |--------------------------------------------------------------------------
    */
    try {
        const resend = getResend();
        const replyTo = getReplyTo();
        /*
        |--------------------------------------------------------------------------
        | Build Resend Payload
        |--------------------------------------------------------------------------
        */
        const emailPayload = {
            from: getFromAddress(),
            to: recipient,
            subject: input.subject,
            html: input.html,
            ...(input.text
                ? {
                    text: input.text,
                }
                : {}),
            ...(replyTo
                ? {
                    replyTo,
                }
                : {}),
            ...(input.attachments?.length
                ? {
                    attachments: input.attachments.map((attachment) => ({
                        filename: attachment.filename,
                        content: attachment.content,
                        ...(attachment.contentType
                            ? {
                                contentType: attachment.contentType,
                            }
                            : {}),
                        ...(attachment.contentId
                            ? {
                                contentId: attachment.contentId,
                            }
                            : {}),
                    })),
                }
                : {}),
        };
        /*
        |--------------------------------------------------------------------------
        | Send Email
        |--------------------------------------------------------------------------
        */
        const response = await resend.emails.send(emailPayload, input.idempotencyKey
            ? {
                idempotencyKey: input.idempotencyKey,
            }
            : undefined);
        /*
        |--------------------------------------------------------------------------
        | Handle Resend Error
        |--------------------------------------------------------------------------
        */
        if (response.error) {
            throw new Error(response.error.message ||
                "Resend failed to send email.");
        }
        /*
        |--------------------------------------------------------------------------
        | Mark Delivery As Sent
        |--------------------------------------------------------------------------
        */
        await prisma_1.prisma.emailDelivery.update({
            where: {
                id: delivery.id,
            },
            data: {
                status: "SENT",
                providerMessageId: response.data?.id,
                sentAt: new Date(),
                failureReason: null,
            },
        });
        /*
        |--------------------------------------------------------------------------
        | Return Result
        |--------------------------------------------------------------------------
        */
        return {
            success: true,
            messageId: response.data?.id,
        };
    }
    catch (error) {
        /*
        |--------------------------------------------------------------------------
        | Normalize Error
        |--------------------------------------------------------------------------
        */
        const message = error instanceof Error
            ? error.message
            : "Unable to send email.";
        /*
        |--------------------------------------------------------------------------
        | Mark Delivery As Failed
        |--------------------------------------------------------------------------
        */
        await prisma_1.prisma.emailDelivery.update({
            where: {
                id: delivery.id,
            },
            data: {
                status: "FAILED",
                failedAt: new Date(),
                failureReason: message,
            },
        });
        /*
        |--------------------------------------------------------------------------
        | Re-throw
        |--------------------------------------------------------------------------
        */
        throw error;
    }
}
