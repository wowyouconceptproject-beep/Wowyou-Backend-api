"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePassToken = generatePassToken;
exports.verifyPassToken = verifyPassToken;
exports.generateRotatingQrToken = generateRotatingQrToken;
exports.verifyRotatingQrToken = verifyRotatingQrToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function getPassJwtSecret() {
    const secret = process.env.PASS_JWT_SECRET;
    if (!secret) {
        throw new Error("PASS_JWT_SECRET is not configured.");
    }
    return secret;
}
function generatePassToken(data) {
    return jsonwebtoken_1.default.sign(data, getPassJwtSecret());
}
/**
 * Legacy pass-token verification.
 * Do not use this function to authorize QR entry.
 */
function verifyPassToken(token) {
    if (typeof token !== "string" || !token.trim()) {
        throw new Error("Pass token is required.");
    }
    const decoded = jsonwebtoken_1.default.verify(token.trim(), getPassJwtSecret());
    if (typeof decoded === "string" ||
        !decoded ||
        typeof decoded !== "object") {
        throw new Error("Invalid pass token payload.");
    }
    const payload = decoded;
    if (typeof payload.purchaseId !== "string" ||
        typeof payload.passId !== "string" ||
        typeof payload.passNumber !== "string" ||
        typeof payload.qrToken !== "string" ||
        typeof payload.nfcToken !== "string" ||
        typeof payload.eventId !== "string" ||
        typeof payload.userId !== "string") {
        throw new Error("Invalid pass token payload.");
    }
    return {
        purchaseId: payload.purchaseId,
        passId: payload.passId,
        passNumber: payload.passNumber,
        qrToken: payload.qrToken,
        nfcToken: payload.nfcToken,
        eventId: payload.eventId,
        userId: payload.userId,
    };
}
/**
 * Creates a QR-entry credential that expires after 60 seconds.
 * It is deliberately separate from the permanent pass JWT.
 */
function generateRotatingQrToken(data) {
    return jsonwebtoken_1.default.sign({
        ...data,
        tokenType: "ROTATING_QR",
    }, getPassJwtSecret(), {
        expiresIn: 60,
    });
}
/**
 * Only a correctly signed, unexpired rotating QR token is accepted.
 */
function verifyRotatingQrToken(token) {
    if (typeof token !== "string" || !token.trim()) {
        throw new Error("Rotating QR token is required.");
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(token.trim(), getPassJwtSecret());
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error("QR code has expired. Refresh the ticket QR code.");
        }
        throw new Error("Invalid or expired QR code.");
    }
    if (typeof decoded === "string" ||
        !decoded ||
        typeof decoded !== "object") {
        throw new Error("Invalid QR token payload.");
    }
    const payload = decoded;
    if (payload.tokenType !== "ROTATING_QR" ||
        typeof payload.purchaseId !== "string" ||
        typeof payload.passId !== "string" ||
        typeof payload.passNumber !== "string" ||
        typeof payload.eventId !== "string" ||
        typeof payload.userId !== "string") {
        throw new Error("Invalid rotating QR token.");
    }
    return {
        tokenType: "ROTATING_QR",
        purchaseId: payload.purchaseId,
        passId: payload.passId,
        passNumber: payload.passNumber,
        eventId: payload.eventId,
        userId: payload.userId,
    };
}
