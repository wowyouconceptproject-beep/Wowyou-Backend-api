"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.completeLogin = completeLogin;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../lib/prisma");
const jwt_1 = require("./jwt");
const login_otp_service_1 = require("./login-otp.service");
/*
|--------------------------------------------------------------------------
| Normalize Registration Role
|--------------------------------------------------------------------------
*/
function normalizeRegistrationRole(role) {
    const normalizedRole = String(role ?? "")
        .trim()
        .toUpperCase();
    if (normalizedRole === "ORGANIZER" ||
        normalizedRole === "VENDOR" ||
        normalizedRole === "ATTENDEE") {
        return normalizedRole;
    }
    throw new Error("Invalid registration role");
}
/*
|--------------------------------------------------------------------------
| Register User
|--------------------------------------------------------------------------
*/
async function registerUser(data) {
    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();
    const email = data.email
        ?.trim()
        .toLowerCase();
    const password = data.password;
    /*
    |--------------------------------------------------------------------------
    | Basic Validation
    |--------------------------------------------------------------------------
    */
    if (!firstName ||
        !lastName ||
        !email ||
        !password) {
        throw new Error("First name, last name, email and password are required");
    }
    /*
    |--------------------------------------------------------------------------
    | Normalize Role
    |--------------------------------------------------------------------------
    */
    const registrationRole = normalizeRegistrationRole(data.role);
    /*
    |--------------------------------------------------------------------------
    | Check Existing User
    |--------------------------------------------------------------------------
    */
    const existingUser = await prisma_1.prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (existingUser) {
        throw new Error("Email already exists");
    }
    /*
    |--------------------------------------------------------------------------
    | Hash Password
    |--------------------------------------------------------------------------
    */
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    /*
    |--------------------------------------------------------------------------
    | Create User
    |--------------------------------------------------------------------------
    */
    const user = await prisma_1.prisma.user.create({
        data: {
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: registrationRole,
        },
    });
    /*
    |--------------------------------------------------------------------------
    | Generate JWT
    |--------------------------------------------------------------------------
    |
    | We retain the existing registration behavior so we do not break the
    | current organizer/attendee onboarding flow.
    |
    */
    const token = (0, jwt_1.generateToken)(user.id);
    /*
    |--------------------------------------------------------------------------
    | Remove Password
    |--------------------------------------------------------------------------
    */
    const { password: _password, ...safeUser } = user;
    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */
    return {
        token,
        user: safeUser,
        requiresEmailVerification: !user.emailVerified,
    };
}
/*
|--------------------------------------------------------------------------
| Login User
|--------------------------------------------------------------------------
|
| Step 1:
|   Verify email + password.
|
| Step 2:
|   Send a 6-digit OTP.
|
| Step 3:
|   Client submits OTP to /auth/verify-login-otp.
|
| JWT is NOT issued until the OTP is successfully verified.
|
*/
async function loginUser(email, password) {
    const normalizedEmail = email
        ?.trim()
        .toLowerCase();
    /*
    |--------------------------------------------------------------------------
    | Validate Email
    |--------------------------------------------------------------------------
    */
    if (!normalizedEmail) {
        throw new Error("Email is required");
    }
    /*
    |--------------------------------------------------------------------------
    | Find User
    |--------------------------------------------------------------------------
    */
    const user = await prisma_1.prisma.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });
    if (!user) {
        throw new Error("Invalid credentials");
    }
    /*
    |--------------------------------------------------------------------------
    | Verify Password
    |--------------------------------------------------------------------------
    */
    const isValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isValid) {
        throw new Error("Invalid credentials");
    }
    /*
    |--------------------------------------------------------------------------
    | Verify Email
    |--------------------------------------------------------------------------
    */
    if (!user.emailVerified) {
        throw new Error("Please verify your email address before logging in");
    }
    /*
    |--------------------------------------------------------------------------
    | Generate Login OTP
    |--------------------------------------------------------------------------
    */
    await (0, login_otp_service_1.createLoginOtp)(user.id);
    /*
    |--------------------------------------------------------------------------
    | Do NOT issue JWT yet
    |--------------------------------------------------------------------------
    */
    return {
        requiresOtp: true,
        email: user.email,
        message: "A verification code has been sent to your email.",
    };
}
/*
|--------------------------------------------------------------------------
| Complete Login
|--------------------------------------------------------------------------
|
| Step 2 of authentication.
|
| Password has already been verified by loginUser().
| The OTP now proves control of the verified email address.
|
*/
async function completeLogin(email, otp) {
    const normalizedEmail = email
        ?.trim()
        .toLowerCase();
    if (!normalizedEmail) {
        throw new Error("Email is required");
    }
    /*
    |--------------------------------------------------------------------------
    | Verify OTP
    |--------------------------------------------------------------------------
    */
    const user = await (0, login_otp_service_1.verifyLoginOtp)(normalizedEmail, otp);
    /*
    |--------------------------------------------------------------------------
    | Final JWT
    |--------------------------------------------------------------------------
    */
    const token = (0, jwt_1.generateToken)(user.id);
    /*
    |--------------------------------------------------------------------------
    | Remove Password
    |--------------------------------------------------------------------------
    */
    const { password: _password, ...safeUser } = user;
    /*
    |--------------------------------------------------------------------------
    | Authenticated Response
    |--------------------------------------------------------------------------
    */
    return {
        token,
        user: safeUser,
    };
}
