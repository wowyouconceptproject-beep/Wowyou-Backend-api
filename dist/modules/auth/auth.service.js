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
async function registerUser(data) {
    const existingUser = await prisma_1.prisma.user.findUnique({
        where: {
            email: data.email,
        },
    });
    if (existingUser) {
        throw new Error("Email already exists");
    }
    const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
    const user = await prisma_1.prisma.user.create({
        data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: hashedPassword,
            role: data.role,
        },
    });
    const token = (0, jwt_1.generateToken)(user.id);
    const { password: _, ...safeUser } = user;
    return {
        token,
        user: safeUser,
    };
}
async function loginUser(email, password) {
    const user = await prisma_1.prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (!user) {
        throw new Error("Invalid credentials");
    }
    const isValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isValid) {
        throw new Error("Invalid credentials");
    }
    const token = (0, jwt_1.generateToken)(user.id);
    const { password: _, ...safeUser } = user;
    return {
        token,
        user: safeUser,
    };
}
