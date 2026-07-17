"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchEvents = searchEvents;
exports.searchOrganizations = searchOrganizations;
exports.globalSearch = globalSearch;
exports.searchSuggestions = searchSuggestions;
const prisma_1 = require("../../lib/prisma");
async function searchEvents(q, limit = 20) {
    return prisma_1.prisma.event.findMany({
        where: {
            status: "PUBLISHED",
            OR: [
                {
                    title: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
                {
                    description: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
                {
                    venue: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
            ],
        },
        include: {
            organization: {
                select: {
                    id: true,
                    name: true,
                },
            },
            _count: {
                select: {
                    attendees: true,
                },
            },
        },
        orderBy: {
            startDate: "asc",
        },
        take: limit,
    });
}
async function searchOrganizations(q, limit = 10) {
    return prisma_1.prisma.organization.findMany({
        where: {
            name: {
                contains: q,
                mode: "insensitive",
            },
        },
        select: {
            id: true,
            name: true,
            logo: true,
            website: true,
        },
        take: limit,
    });
}
async function globalSearch(q, limit = 20) {
    const [events, organizations] = await Promise.all([
        searchEvents(q, limit),
        searchOrganizations(q, limit),
    ]);
    return {
        success: true,
        events,
        organizations,
    };
}
async function searchSuggestions(q) {
    const events = await prisma_1.prisma.event.findMany({
        where: {
            status: "PUBLISHED",
            title: {
                contains: q,
                mode: "insensitive",
            },
        },
        select: {
            id: true,
            title: true,
        },
        take: 10,
    });
    const organizations = await prisma_1.prisma.organization.findMany({
        where: {
            name: {
                contains: q,
                mode: "insensitive",
            },
        },
        select: {
            id: true,
            name: true,
        },
        take: 5,
    });
    return {
        success: true,
        suggestions: [
            ...events.map((e) => ({
                id: e.id,
                title: e.title,
                type: "event",
            })),
            ...organizations.map((o) => ({
                id: o.id,
                title: o.name,
                type: "organization",
            })),
        ],
    };
}
