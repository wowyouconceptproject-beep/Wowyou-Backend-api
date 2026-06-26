"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePassToken = generatePassToken;
exports.verifyPassToken = verifyPassToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET = process.env.PASS_JWT_SECRET;
const EXPIRES_IN = "60s";
function generatePassToken(data) {
    return jsonwebtoken_1.default.sign(data, SECRET, {
        expiresIn: EXPIRES_IN,
    });
}
function verifyPassToken(token) {
    return jsonwebtoken_1.default.verify(token, SECRET);
}
