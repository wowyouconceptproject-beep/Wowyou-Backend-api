"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.me = me;
const prisma_1 = require("../../lib/prisma");
const auth_service_1 = require("./auth.service");
async function register(req, res) {
    try {
        console.log("REGISTER BODY:", JSON.stringify(req.body, null, 2));
        console.log("DATABASE_URL EXISTS:", !!process.env.DATABASE_URL);
        console.log("JWT_SECRET EXISTS:", !!process.env.JWT_SECRET);
        const result = await (0, auth_service_1.registerUser)(req.body);
        console.log("REGISTER SUCCESS:", result.user?.email);
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
async function login(req, res) {
    try {
        console.log("LOGIN ATTEMPT:", req.body?.email);
        const { email, password, } = req.body;
        const result = await (0, auth_service_1.loginUser)(email, password);
        console.log("LOGIN SUCCESS:", email);
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
