"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestPasswordReset = requestPasswordReset;
exports.verifyPasswordResetCode = verifyPasswordResetCode;
exports.resetPassword = resetPassword;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../lib/prisma");
const email_service_1 = require("../email/email.service");
const email_templates_1 = require("../email/email.templates");
const CODE_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 8;
function generateCode() {
    return String(crypto_1.default.randomInt(100000, 1000000));
}
function hashValue(value) {
    return crypto_1.default
        .createHash("sha256")
        .update(value)
        .digest("hex");
}
function safeEqual(a, b) {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    return (left.length === right.length &&
        crypto_1.default.timingSafeEqual(left, right));
}
/*
|--------------------------------------------------------------------------
| Request Password Reset
|--------------------------------------------------------------------------
*/
async function requestPasswordReset(email) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
        throw new Error("Email is required.");
    }
    const genericResponse = {
        success: true,
        message: "If an eligible account exists for this email, a password reset code will be sent.",
    };
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: normalizedEmail },
    });
    // Do not disclose whether an account exists or is eligible.
    if (!user || !user.emailVerified || !user.isActive) {
        return genericResponse;
    }
    const now = new Date();
    const recentCode = await prisma_1.prisma.passwordResetCode.findFirst({
        where: {
            userId: user.id,
            usedAt: null,
            createdAt: {
                gt: new Date(now.getTime() - RESEND_COOLDOWN_SECONDS * 1000),
            },
        },
        orderBy: { createdAt: "desc" },
    });
    if (recentCode) {
        return genericResponse;
    }
    await prisma_1.prisma.passwordResetCode.updateMany({
        where: {
            userId: user.id,
            usedAt: null,
        },
        data: { usedAt: now },
    });
    const code = generateCode();
    const codeHash = hashValue(code);
    await prisma_1.prisma.passwordResetCode.create({
        data: {
            userId: user.id,
            codeHash,
            expiresAt: new Date(now.getTime() + CODE_EXPIRY_MINUTES * 60 * 1000),
        },
    });
    const template = (0, email_templates_1.passwordResetEmailTemplate)({
        firstName: user.firstName,
        otp: code,
    });
    try {
        await (0, email_service_1.sendEmail)({
            type: "PASSWORD_RESET",
            to: user.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
            userId: user.id,
            idempotencyKey: `password_reset_${user.id}_${codeHash}`,
        });
    }
    catch (error) {
        // Do not leave a usable code when email delivery fails.
        await prisma_1.prisma.passwordResetCode.updateMany({
            where: {
                userId: user.id,
                codeHash,
                usedAt: null,
            },
            data: { usedAt: new Date() },
        });
        throw error;
    }
    return genericResponse;
}
/*
|--------------------------------------------------------------------------
| Verify Password Reset Code
|--------------------------------------------------------------------------
*/
async function verifyPasswordResetCode(email, code) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();
    if (!normalizedEmail || !/^\d{6}$/.test(normalizedCode)) {
        throw new Error("Enter a valid email and 6-digit code.");
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (!user || !user.emailVerified || !user.isActive) {
        throw new Error("Invalid or expired reset code.");
    }
    const resetCode = await prisma_1.prisma.passwordResetCode.findFirst({
        where: {
            userId: user.id,
            usedAt: null,
        },
        orderBy: { createdAt: "desc" },
    });
    if (!resetCode) {
        throw new Error("Invalid or expired reset code.");
    }
    const now = new Date();
    if (resetCode.expiresAt <= now ||
        resetCode.attempts >= MAX_ATTEMPTS) {
        await prisma_1.prisma.passwordResetCode.update({
            where: { id: resetCode.id },
            data: { usedAt: now },
        });
        throw new Error("Invalid or expired reset code.");
    }
    const suppliedHash = hashValue(normalizedCode);
    if (!safeEqual(suppliedHash, resetCode.codeHash)) {
        const attempts = resetCode.attempts + 1;
        await prisma_1.prisma.passwordResetCode.update({
            where: { id: resetCode.id },
            data: {
                attempts,
                ...(attempts >= MAX_ATTEMPTS ? { usedAt: now } : {}),
            },
        });
        throw new Error("Invalid or expired reset code.");
    }
    // A verified code can be exchanged for a short-lived reset token once.
    const resetToken = crypto_1.default.randomBytes(32).toString("hex");
    const resetTokenHash = hashValue(resetToken);
    const claimed = await prisma_1.prisma.passwordResetCode.updateMany({
        where: {
            id: resetCode.id,
            usedAt: null,
            verifiedAt: null,
            attempts: { lt: MAX_ATTEMPTS },
            expiresAt: { gt: now },
        },
        data: {
            verifiedAt: now,
            resetTokenHash,
            expiresAt: new Date(now.getTime() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000),
        },
    });
    if (claimed.count !== 1) {
        throw new Error("Invalid or expired reset code.");
    }
    return {
        success: true,
        resetToken,
        expiresInSeconds: RESET_TOKEN_EXPIRY_MINUTES * 60,
        message: "Code verified. You can now set a new password.",
    };
}
/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
*/
async function resetPassword(email, resetToken, newPassword) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !resetToken.trim()) {
        throw new Error("Email and reset token are required.");
    }
    if (typeof newPassword !== "string" ||
        newPassword.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }
    if (newPassword.length > 128) {
        throw new Error("Password must not exceed 128 characters.");
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (!user || !user.emailVerified || !user.isActive) {
        throw new Error("Invalid or expired reset session.");
    }
    const now = new Date();
    const resetTokenHash = hashValue(resetToken.trim());
    const resetCode = await prisma_1.prisma.passwordResetCode.findFirst({
        where: {
            userId: user.id,
            resetTokenHash,
            verifiedAt: { not: null },
            usedAt: null,
            expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
    });
    if (!resetCode) {
        throw new Error("Invalid or expired reset session.");
    }
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
    await prisma_1.prisma.$transaction(async (tx) => {
        // Claim the reset session so it cannot be reused.
        const claimed = await tx.passwordResetCode.updateMany({
            where: {
                id: resetCode.id,
                resetTokenHash,
                verifiedAt: { not: null },
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
            data: { usedAt: new Date() },
        });
        if (claimed.count !== 1) {
            throw new Error("Invalid or expired reset session.");
        }
        await tx.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });
        // Invalidate every other outstanding reset session.
        await tx.passwordResetCode.updateMany({
            where: {
                userId: user.id,
                usedAt: null,
            },
            data: { usedAt: new Date() },
        });
        // Invalidate active login codes after a password change.
        await tx.loginOtp.updateMany({
            where: {
                userId: user.id,
                usedAt: null,
            },
            data: { usedAt: new Date() },
        });
    });
    return {
        success: true,
        message: "Password reset successfully. Please log in with your new password.",
    };
}
