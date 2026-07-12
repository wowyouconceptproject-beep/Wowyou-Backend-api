"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVendorApplicationSchema = void 0;
const zod_1 = require("zod");
exports.createVendorApplicationSchema = zod_1.z.object({
    eventId: zod_1.z.string().min(1),
    businessName: zod_1.z
        .string()
        .min(2)
        .max(120),
    category: zod_1.z
        .string()
        .min(2)
        .max(80),
    contactName: zod_1.z
        .string()
        .min(2)
        .max(120),
    email: zod_1.z
        .string()
        .email(),
    phone: zod_1.z
        .string()
        .min(7)
        .max(30),
    description: zod_1.z
        .string()
        .min(10)
        .max(5000),
    boothSize: zod_1.z
        .string()
        .max(80)
        .optional(),
    message: zod_1.z
        .string()
        .max(1000)
        .optional(),
});
