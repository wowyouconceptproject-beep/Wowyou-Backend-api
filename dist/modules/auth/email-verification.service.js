"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = sendVerificationEmail;
exports.verifyUserEmail = verifyUserEmail;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../lib/prisma");
const email_service_1 = require("../email/email.service");
const email_templates_1 = require("../email/email.templates");
const VERIFICATION_EXPIRY_HOURS = 24;
function generateVerificationToken() {
    const token = crypto_1.default.randomBytes(32).toString("hex");
    const tokenHash = crypto_1.default
        .createHash("sha256")
        .update(token)
        .digest("hex");
    return {
        token,
        tokenHash,
    };
}
function getVerificationUrl(token) {
    const appUrl = process.env.WEB_APP_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:3000";
    return `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
}
async function sendVerificationEmail(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: {
            id: userId,
        },
    });
    if (!user) {
        throw new Error("User not found");
    }
    if (user.emailVerified) {
        return {
            success: true,
            alreadyVerified: true,
        };
    }
    await prisma_1.prisma.emailVerificationToken.deleteMany({
        where: {
            userId: user.id,
            usedAt: null,
        },
    });
    const { token, tokenHash, } = generateVerificationToken();
    const expiresAt = new Date(Date.now() +
        VERIFICATION_EXPIRY_HOURS *
            60 *
            60 *
            1000);
    await prisma_1.prisma.emailVerificationToken.create({
        data: {
            userId: user.id,
            tokenHash,
            expiresAt,
        },
    });
    const template = (0, email_templates_1.verificationEmailTemplate)({
        firstName: user.firstName,
        verificationUrl: getVerificationUrl(token),
    });
    return (0, email_service_1.sendEmail)({
        type: "EMAIL_VERIFICATION",
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        userId: user.id,
        idempotencyKey: `email_verification_${user.id}_${tokenHash}`,
    });
}
async function verifyUserEmail(token) {
    if (!token?.trim()) {
        throw new Error("Verification token is required");
    }
    const tokenHash = crypto_1.default
        .createHash("sha256")
        .update(token.trim())
        .digest("hex");
    const verificationToken = await prisma_1.prisma.emailVerificationToken.findUnique({
        where: {
            tokenHash,
        },
    });
    if (!verificationToken) {
        throw new Error("Invalid verification token");
    }
    if (verificationToken.usedAt) {
        throw new Error("Verification token has already been used");
    }
    if (verificationToken.expiresAt <
        new Date()) {
        throw new Error("Verification token has expired");
    }
    const user = await prisma_1.prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
            where: {
                id: verificationToken.userId,
            },
            data: {
                emailVerified: true,
            },
        });
        await tx.emailVerificationToken.update({
            where: {
                id: verificationToken.id,
            },
            data: {
                usedAt: new Date(),
            },
        });
        return updatedUser;
    });
    const { password: _password, ...safeUser } = user;
    return {
        user: safeUser,
    };
}
