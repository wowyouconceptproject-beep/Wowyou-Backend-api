"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../lib/prisma");
const jwt_1 = require("./jwt");
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
    };
}
/*
|--------------------------------------------------------------------------
| Login User
|--------------------------------------------------------------------------
*/
async function loginUser(email, password) {
    const normalizedEmail = email
        ?.trim()
        .toLowerCase();
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
    | Generate JWT
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
    | Response
    |--------------------------------------------------------------------------
    */
    return {
        token,
        user: safeUser,
    };
}
