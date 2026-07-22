"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySocketToken = verifySocketToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function verifySocketToken(token) {
    if (!token)
        return null;
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
    catch {
        return null;
    }
}
