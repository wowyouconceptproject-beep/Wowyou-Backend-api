"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOpsToken = generateOpsToken;
exports.verifyOpsToken = verifyOpsToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET = process.env.JWT_SECRET ||
    "wowyou-dev-secret";
const EXPIRES_IN = "7d";
function generateOpsToken(payload) {
    return jsonwebtoken_1.default.sign(payload, SECRET, {
        expiresIn: EXPIRES_IN,
    });
}
function verifyOpsToken(token) {
    return jsonwebtoken_1.default.verify(token, SECRET);
}
