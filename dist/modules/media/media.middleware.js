"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadEventCover = void 0;
const multer_1 = __importDefault(require("multer"));
const storage = multer_1.default.memoryStorage();
exports.uploadEventCover = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (_req, file, callback) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];
        if (!allowedTypes.includes(file.mimetype)) {
            callback(new Error("Only JPG, PNG and WEBP images are allowed."));
            return;
        }
        callback(null, true);
    },
});
