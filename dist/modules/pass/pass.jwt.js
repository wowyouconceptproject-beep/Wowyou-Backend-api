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
const PASS_JWT_SECRET = getPassJwtSecret();
const EXPIRES_IN = "60s";
/*
|--------------------------------------------------------------------------
| Generate Pass Token
|--------------------------------------------------------------------------
*/
function generatePassToken(data) {
    return jsonwebtoken_1.default.sign(data, PASS_JWT_SECRET, {
        expiresIn: EXPIRES_IN,
    });
}
/*
|--------------------------------------------------------------------------
| Verify Pass Token
|--------------------------------------------------------------------------
*/
function verifyPassToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, PASS_JWT_SECRET);
    /*
    |--------------------------------------------------------------------------
    | Payload Must Be An Object
    |--------------------------------------------------------------------------
    */
    if (typeof decoded ===
        "string") {
        throw new Error("Invalid pass token payload.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Required Claims
    |--------------------------------------------------------------------------
    */
    if (typeof decoded.purchaseId !==
        "string" ||
        typeof decoded.passId !==
            "string" ||
        typeof decoded.passNumber !==
            "string" ||
        typeof decoded.qrToken !==
            "string" ||
        typeof decoded.nfcToken !==
            "string" ||
        typeof decoded.eventId !==
            "string" ||
        typeof decoded.userId !==
            "string") {
        throw new Error("Invalid pass token payload.");
    }
    /*
    |--------------------------------------------------------------------------
    | Return Typed Payload
    |--------------------------------------------------------------------------
    */
    return {
        purchaseId: decoded.purchaseId,
        passId: decoded.passId,
        passNumber: decoded.passNumber,
        qrToken: decoded.qrToken,
        nfcToken: decoded.nfcToken,
        eventId: decoded.eventId,
        userId: decoded.userId,
    };
}
