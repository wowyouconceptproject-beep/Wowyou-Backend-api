"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoginOtp = createLoginOtp;
exports.verifyLoginOtp = verifyLoginOtp;
exports.resendLoginOtp = resendLoginOtp;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../lib/prisma");
const email_service_1 = require("../email/email.service");
const email_templates_1 = require("../email/email.templates");
/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
/*
|--------------------------------------------------------------------------
| OTP Helpers
|--------------------------------------------------------------------------
*/
function generateOtp() {
    return String(crypto_1.default.randomInt(100000, 1000000));
}
function hashOtp(otp) {
    return crypto_1.default
        .createHash("sha256")
        .update(otp)
        .digest("hex");
}
/*
|--------------------------------------------------------------------------
| Create Login OTP
|--------------------------------------------------------------------------
*/
async function createLoginOtp(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: {
            id: userId,
        },
    });
    if (!user) {
        throw new Error("User not found.");
    }
    if (!user.emailVerified) {
        throw new Error("Please verify your email address before requesting a login code.");
    }
    /*
    |--------------------------------------------------------------------------
    | Prevent OTP Spam
    |--------------------------------------------------------------------------
    */
    const recentOtp = await prisma_1.prisma.loginOtp.findFirst({
        where: {
            userId: user.id,
            usedAt: null,
            createdAt: {
                gt: new Date(Date.now() -
                    RESEND_COOLDOWN_SECONDS *
                        1000),
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    if (recentOtp) {
        throw new Error("Please wait before requesting another login code.");
    }
    /*
    |--------------------------------------------------------------------------
    | Invalidate Existing OTPs
    |--------------------------------------------------------------------------
    */
    await prisma_1.prisma.loginOtp.updateMany({
        where: {
            userId: user.id,
            usedAt: null,
        },
        data: {
            usedAt: new Date(),
        },
    });
    /*
    |--------------------------------------------------------------------------
    | Generate OTP
    |--------------------------------------------------------------------------
    */
    const otp = generateOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() +
        OTP_EXPIRY_MINUTES *
            60 *
            1000);
    /*
    |--------------------------------------------------------------------------
    | Persist OTP
    |--------------------------------------------------------------------------
    */
    await prisma_1.prisma.loginOtp.create({
        data: {
            userId: user.id,
            codeHash,
            expiresAt,
        },
    });
    /*
    |--------------------------------------------------------------------------
    | Email
    |--------------------------------------------------------------------------
    */
    const template = (0, email_templates_1.loginOtpEmailTemplate)({
        firstName: user.firstName,
        otp,
    });
    await (0, email_service_1.sendEmail)({
        type: "LOGIN_OTP",
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        userId: user.id,
        idempotencyKey: `login_otp_${user.id}_${codeHash}`,
    });
    return {
        success: true,
        expiresAt,
    };
}
/*
|--------------------------------------------------------------------------
| Verify Login OTP
|--------------------------------------------------------------------------
*/
async function verifyLoginOtp(email, otp) {
    const normalizedEmail = email
        ?.trim()
        .toLowerCase();
    const normalizedOtp = otp
        ?.trim();
    if (!normalizedEmail) {
        throw new Error("Email is required.");
    }
    if (!/^\d{6}$/.test(normalizedOtp)) {
        throw new Error("Enter the 6-digit verification code.");
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });
    if (!user) {
        throw new Error("Invalid verification code.");
    }
    const loginOtp = await prisma_1.prisma.loginOtp.findFirst({
        where: {
            userId: user.id,
            usedAt: null,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    if (!loginOtp) {
        throw new Error("No active login code found. Request a new code.");
    }
    if (loginOtp.expiresAt <
        new Date()) {
        await prisma_1.prisma.loginOtp.update({
            where: {
                id: loginOtp.id,
            },
            data: {
                usedAt: new Date(),
            },
        });
        throw new Error("Your login code has expired. Request a new code.");
    }
    if (loginOtp.attempts >=
        MAX_ATTEMPTS) {
        await prisma_1.prisma.loginOtp.update({
            where: {
                id: loginOtp.id,
            },
            data: {
                usedAt: new Date(),
            },
        });
        throw new Error("Too many incorrect attempts. Request a new code.");
    }
    const suppliedHash = hashOtp(normalizedOtp);
    if (suppliedHash !==
        loginOtp.codeHash) {
        const nextAttempts = loginOtp.attempts + 1;
        await prisma_1.prisma.loginOtp.update({
            where: {
                id: loginOtp.id,
            },
            data: {
                attempts: nextAttempts,
                ...(nextAttempts >=
                    MAX_ATTEMPTS
                    ? {
                        usedAt: new Date(),
                    }
                    : {}),
            },
        });
        throw new Error(nextAttempts >=
            MAX_ATTEMPTS
            ? "Too many incorrect attempts. Request a new code."
            : "Invalid verification code.");
    }
    /*
    |--------------------------------------------------------------------------
    | Consume OTP
    |--------------------------------------------------------------------------
    */
    await prisma_1.prisma.loginOtp.update({
        where: {
            id: loginOtp.id,
        },
        data: {
            usedAt: new Date(),
        },
    });
    return user;
}
/*
|--------------------------------------------------------------------------
| Resend Login OTP
|--------------------------------------------------------------------------
*/
async function resendLoginOtp(email) {
    const normalizedEmail = email
        ?.trim()
        .toLowerCase();
    if (!normalizedEmail) {
        throw new Error("Email is required.");
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });
    if (!user) {
        throw new Error("No account found with this email.");
    }
    if (!user.emailVerified) {
        throw new Error("Please verify your email address first.");
    }
    return createLoginOtp(user.id);
}
