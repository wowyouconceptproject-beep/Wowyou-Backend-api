"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePassToken = generatePassToken;
exports.verifyPassToken = verifyPassToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/
function getPassJwtSecret() {
    const secret = process.env.PASS_JWT_SECRET;
    if (!secret) {
        throw new Error("PASS_JWT_SECRET is not configured.");
    }
    return secret;
}
/*
|--------------------------------------------------------------------------
| Generate Pass Token
|--------------------------------------------------------------------------
|
| Pass JWTs do not expire after 60 seconds.
| The database remains authoritative for pass validity.
|
*/
function generatePassToken(data) {
    return jsonwebtoken_1.default.sign(data, getPassJwtSecret());
}
/*
|--------------------------------------------------------------------------
| Verify Pass Token
|--------------------------------------------------------------------------
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
