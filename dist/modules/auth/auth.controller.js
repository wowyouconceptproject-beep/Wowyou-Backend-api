"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.verifyLoginCode = verifyLoginCode;
exports.resendLoginCode = resendLoginCode;
exports.logout = logout;
exports.verifyEmail = verifyEmail;
exports.resendVerification = resendVerification;
exports.me = me;
exports.forgotPassword = forgotPassword;
exports.verifyResetCode = verifyResetCode;
exports.resetPasswordController = resetPasswordController;
const node_crypto_1 = require("node:crypto");
const prisma_1 = require("../../lib/prisma");
const auth_service_1 = require("./auth.service");
const email_verification_service_1 = require("./email-verification.service");
const login_otp_service_1 = require("./login-otp.service");
const password_reset_service_1 = require("./password-reset.service");
const auth_middleware_1 = require("./auth.middleware");
const SESSION_DURATION_MS = 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";
/**
 * Keep cookie attributes consistent when setting and clearing
 * the browser session cookie.
 *
 * Production:
 * - HttpOnly prevents JavaScript from reading the session token.
 * - Secure requires HTTPS.
 * - SameSite=None allows cross-origin credentialed requests.
 * - Domain=.wowyouevent.com shares the cookie across the frontend
 *   and API subdomains.
 *
 * Development:
 * - SameSite=Lax supports ordinary local development.
 * - No domain is set for localhost.
 */
const sessionCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    ...(isProduction ? { domain: ".wowyouevent.com" } : {}),
};
function isBrowserClient(req) {
    return req.get("X-Auth-Mode") === "cookie";
}
async function createBrowserSession(userId, res) {
    const sessionToken = (0, node_crypto_1.randomBytes)(32).toString("hex");
    const now = new Date();
    await prisma_1.prisma.authSession.create({
        data: {
            userId,
            tokenHash: (0, auth_middleware_1.hashSessionToken)(sessionToken),
            lastActivityAt: now,
            expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
        },
    });
    res.cookie(auth_middleware_1.SESSION_COOKIE_NAME, sessionToken, {
        ...sessionCookieOptions,
        maxAge: SESSION_DURATION_MS,
    });
}
/*
|--------------------------------------------------------------------------
| Register
|--------------------------------------------------------------------------
*/
async function register(req, res) {
    try {
        console.log("REGISTER BODY:", JSON.stringify(req.body, null, 2));
        console.log("DATABASE_URL EXISTS:", Boolean(process.env.DATABASE_URL));
        console.log("JWT_SECRET EXISTS:", Boolean(process.env.JWT_SECRET));
        const result = await (0, auth_service_1.registerUser)(req.body);
        console.log("REGISTER SUCCESS:", result.user?.email);
        try {
            await (0, email_verification_service_1.sendVerificationEmail)(result.user.id);
        }
        catch (emailError) {
            console.error("VERIFICATION EMAIL ERROR:", emailError);
        }
        // Registration does not create an authenticated browser session.
        // Preserve the existing response for compatibility.
        if (isBrowserClient(req)) {
            const { token: _token, ...browserResult } = result;
            return res.status(201).json({
                success: true,
                ...browserResult,
            });
        }
        return res.status(201).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("REGISTER ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error?.message || "Registration failed",
            stack: process.env.NODE_ENV !== "production"
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
        const { email, password } = req.body;
        const result = await (0, auth_service_1.loginUser)(email, password);
        console.log("LOGIN OTP REQUESTED:", email);
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("LOGIN ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error?.message || "Login failed",
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
        if (isBrowserClient(req)) {
            await createBrowserSession(result.user.id, res);
            return res.status(200).json({
                success: true,
                user: result.user,
            });
        }
        // Preserve JWT authentication for Flutter and other existing clients.
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("VERIFY LOGIN OTP ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error?.message || "Verification failed",
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
        console.error("RESEND LOGIN OTP ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error?.message || "Failed to resend login code",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/
async function logout(req, res) {
    try {
        const cookieHeader = req.headers.cookie ?? "";
        const cookie = cookieHeader
            .split(";")
            .map((part) => part.trim())
            .find((part) => part.startsWith(`${auth_middleware_1.SESSION_COOKIE_NAME}=`));
        if (cookie) {
            const encodedToken = cookie.slice(auth_middleware_1.SESSION_COOKIE_NAME.length + 1);
            let sessionToken = null;
            try {
                sessionToken = decodeURIComponent(encodedToken);
            }
            catch {
                sessionToken = null;
            }
            if (sessionToken) {
                await prisma_1.prisma.authSession.updateMany({
                    where: {
                        tokenHash: (0, auth_middleware_1.hashSessionToken)(sessionToken),
                        revokedAt: null,
                    },
                    data: {
                        revokedAt: new Date(),
                    },
                });
            }
        }
        res.clearCookie(auth_middleware_1.SESSION_COOKIE_NAME, sessionCookieOptions);
        return res.status(200).json({
            success: true,
            message: "Logged out successfully.",
        });
    }
    catch (error) {
        console.error("LOGOUT ERROR:", error);
        res.clearCookie(auth_middleware_1.SESSION_COOKIE_NAME, sessionCookieOptions);
        return res.status(500).json({
            success: false,
            message: "Unable to complete logout.",
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
        console.error("VERIFY EMAIL ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error?.message || "Email verification failed",
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
            where: { email },
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
        console.error("RESEND VERIFICATION ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error?.message || "Failed to resend verification email",
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
            where: { id: req.user.userId },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const { password: _password, ...safeUser } = user;
        return res.status(200).json({
            success: true,
            user: safeUser,
        });
    }
    catch (error) {
        console.error("ME ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Forgot Password
|--------------------------------------------------------------------------
*/
async function forgotPassword(req, res) {
    try {
        const email = String(req.body?.email ?? "")
            .trim()
            .toLowerCase();
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }
        const result = await (0, password_reset_service_1.requestPasswordReset)(email);
        return res.status(200).json(result);
    }
    catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to process the request. Please try again.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Verify Password Reset Code
|--------------------------------------------------------------------------
*/
async function verifyResetCode(req, res) {
    try {
        const email = String(req.body?.email ?? "")
            .trim()
            .toLowerCase();
        const code = String(req.body?.code ?? "").trim();
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: "Email and reset code are required.",
            });
        }
        const result = await (0, password_reset_service_1.verifyPasswordResetCode)(email, code);
        return res.status(200).json(result);
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Code verification failed.";
        const expectedError = message.includes("required") ||
            message.includes("valid email") ||
            message.includes("Invalid or expired");
        return res.status(expectedError ? 400 : 500).json({
            success: false,
            message: expectedError
                ? message
                : "Unable to verify the code. Please try again.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
*/
async function resetPasswordController(req, res) {
    try {
        const email = String(req.body?.email ?? "")
            .trim()
            .toLowerCase();
        const resetToken = String(req.body?.resetToken ?? "").trim();
        const newPassword = req.body?.newPassword;
        if (!email || !resetToken || typeof newPassword !== "string") {
            return res.status(400).json({
                success: false,
                message: "Email, reset token and new password are required.",
            });
        }
        const result = await (0, password_reset_service_1.resetPassword)(email, resetToken, newPassword);
        return res.status(200).json(result);
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Password reset failed.";
        const expectedError = message.includes("required") ||
            message.includes("at least") ||
            message.includes("must not exceed") ||
            message.includes("Invalid or expired");
        return res.status(expectedError ? 400 : 500).json({
            success: false,
            message: expectedError
                ? message
                : "Unable to reset your password. Please try again.",
        });
    }
}
