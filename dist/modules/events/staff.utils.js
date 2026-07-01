"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessCode = generateAccessCode;
const prisma_1 = require("../../lib/prisma");
function randomChunk(length = 4) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result +=
            chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}
async function generateAccessCode() {
    while (true) {
        const code = `OPS-${randomChunk()}-${randomChunk()}`;
        const exists = await prisma_1.prisma.eventStaff.findUnique({
            where: {
                accessCode: code,
            },
        });
        if (!exists) {
            return code;
        }
    }
}
