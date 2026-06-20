"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = auth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function auth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const token = authHeader.replace("Bearer ", "");
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }
}
