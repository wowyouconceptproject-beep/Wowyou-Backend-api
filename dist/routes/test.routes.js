"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
router.get("/db", async (_req, res) => {
    const users = await prisma_1.prisma.user.count();
    return res.json({
        success: true,
        users,
    });
});
exports.default = router;
