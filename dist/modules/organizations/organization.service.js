"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrganization = createOrganization;
exports.getMyOrganization = getMyOrganization;
const prisma_1 = require("../../lib/prisma");
const billing_service_1 = require("../billing/billing.service");
const client_1 = require("@prisma/client");
/*
|--------------------------------------------------------------------------
| Create Organization
|--------------------------------------------------------------------------
*/
async function createOrganization(userId, name, slug, plan = client_1.OrganizerPlan.STARTER) {
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
    /*
    |--------------------------------------------------------------------------
    | Create Organization
    |--------------------------------------------------------------------------
    */
    const organization = await prisma_1.prisma.organization.create({
        data: {
            name,
            slug,
            ownerId: userId,
        },
    });
    /*
    |--------------------------------------------------------------------------
    | Start 14-Day Organizer Trial
    |--------------------------------------------------------------------------
    |
    | New organizations receive the selected plan for 14 days without
    | requiring payment.
    |
    */
    await (0, billing_service_1.createOrganizationTrial)(organization.id, plan);
    /*
    |--------------------------------------------------------------------------
    | Return Organization
    |--------------------------------------------------------------------------
    */
    return organization;
}
/*
|--------------------------------------------------------------------------
| Get My Organization
|--------------------------------------------------------------------------
*/
async function getMyOrganization(userId) {
    return prisma_1.prisma.organization.findUnique({
        where: {
            ownerId: userId,
        },
        include: {
            events: true,
            subscription: true,
        },
    });
}
