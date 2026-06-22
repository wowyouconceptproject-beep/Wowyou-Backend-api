"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrganization = createOrganization;
exports.getMyOrganization = getMyOrganization;
const prisma_1 = require("../../lib/prisma");
async function createOrganization(userId, name, slug) {
    const existingOrganization = await prisma_1.prisma.organization.findUnique({
        where: {
            ownerId: userId,
        },
    });
    if (existingOrganization) {
        throw new Error("You already have an organization");
    }
    const existingSlug = await prisma_1.prisma.organization.findUnique({
        where: {
            slug,
        },
    });
    if (existingSlug) {
        throw new Error("Slug already exists");
    }
    return prisma_1.prisma.organization.create({
        data: {
            name,
            slug,
            ownerId: userId,
        },
    });
}
async function getMyOrganization(userId) {
    return prisma_1.prisma.organization.findUnique({
        where: {
            ownerId: userId,
        },
        include: {
            events: true,
        },
    });
}
