"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.verifyLoginCode = verifyLoginCode;
exports.resendLoginCode = resendLoginCode;
exports.verifyEmail = verifyEmail;
exports.resendVerification = resendVerification;
exports.me = me;
const prisma_1 = require("../../lib/prisma");
const auth_service_1 = require("./auth.service");
const email_verification_service_1 = require("./email-verification.service");
const login_otp_service_1 = require("./login-otp.service");
/*
|--------------------------------------------------------------------------
| Register
|--------------------------------------------------------------------------
*/
async function register(req, res) {
    try {
        console.log("REGISTER BODY:", JSON.stringify(req.body, null, 2));
        console.log("DATABASE_URL EXISTS:", !!process.env.DATABASE_URL);
        console.log("JWT_SECRET EXISTS:", !!process.env.JWT_SECRET);
        const result = await (0, auth_service_1.registerUser)(req.body);
        console.log("REGISTER SUCCESS:", result.user?.email);
        /*
        |--------------------------------------------------------------------------
        | Send Verification Email
        |--------------------------------------------------------------------------
        */
        try {
            await (0, email_verification_service_1.sendVerificationEmail)(result.user.id);
        }
        catch (emailError) {
            console.error("VERIFICATION EMAIL ERROR:", emailError);
        }
        return res.status(201).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("REGISTER ERROR:");
        console.error(error);
        return res.status(400).json({
            success: false,
            message: error?.message ||
                "Registration failed",
            stack: process.env.NODE_ENV !==
                "production"
                ? error?.stack
                : undefined,
        });
    }
}
/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/
async function login(req, res) {
    try {
        console.log("LOGIN ATTEMPT:", req.body?.email);
        const { email, password, } = req.body;
        const result = await (0, auth_service_1.loginUser)(email, password);
        console.log("LOGIN OTP REQUESTED:", email);
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("LOGIN ERROR:");
        console.error(error);
        return res.status(400).json({
            success: false,
            message: error?.message ||
                "Login failed",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Verify Login OTP
|--------------------------------------------------------------------------
*/
async function verifyLoginCode(req, res) {
    try {
        const email = String(req.body?.email ?? "")
            .trim()
            .toLowerCase();
        const otp = String(req.body?.otp ?? "").trim();
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and verification code are required",
            });
        }
        const result = await (0, auth_service_1.completeLogin)(email, otp);
        console.log("LOGIN OTP VERIFIED:", email);
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("VERIFY LOGIN OTP ERROR:");
        console.error(error);
        return res.status(400).json({
            success: false,
            message: error?.message ||
                "Verification failed",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Resend Login OTP
|--------------------------------------------------------------------------
*/
async function resendLoginCode(req, res) {
    try {
        const email = String(req.body?.email ?? "")
            .trim()
            .toLowerCase();
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }
        await (0, login_otp_service_1.resendLoginOtp)(email);
        console.log("LOGIN OTP RESENT:", email);
        return res.status(200).json({
            success: true,
            message: "Login code sent",
        });
    }
    catch (error) {
        console.error("RESEND LOGIN OTP ERROR:");
        console.error(error);
        return res.status(400).json({
            success: false,
            message: error?.message ||
                "Failed to resend login code",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Verify Email
|--------------------------------------------------------------------------
*/
async function verifyEmail(req, res) {
    try {
        const token = String(req.query.token ?? "").trim();
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Verification token is required",
            });
        }
        const result = await (0, email_verification_service_1.verifyUserEmail)(token);
        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
            ...result,
        });
    }
    catch (error) {
        console.error("VERIFY EMAIL ERROR:");
        console.error(error);
        return res.status(400).json({
            success: false,
            message: error?.message ||
                "Email verification failed",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Resend Verification Email
|--------------------------------------------------------------------------
*/
async function resendVerification(req, res) {
    try {
        const email = String(req.body?.email ?? "")
            .trim()
            .toLowerCase();
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: {
                email,
            },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No account found with this email",
            });
        }
        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified",
            });
        }
        await (0, email_verification_service_1.sendVerificationEmail)(user.id);
        return res.status(200).json({
            success: true,
            message: "Verification email sent",
        });
    }
    catch (error) {
        console.error("RESEND VERIFICATION ERROR:");
        console.error(error);
        return res.status(400).json({
            success: false,
            message: error?.message ||
                "Failed to resend verification email",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Current User
|--------------------------------------------------------------------------
*/
async function me(req, res) {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: {
                id: req.user.userId,
            },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const { password: _, ...safeUser } = user;
        return res.status(200).json({
            success: true,
            user: safeUser,
        });
    }
    catch (error) {
        console.error("ME ERROR:");
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error?.message ||
                "Server error",
        });
    }
}
