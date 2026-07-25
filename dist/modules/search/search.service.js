"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchEvents = searchEvents;
exports.searchOrganizations = searchOrganizations;
exports.globalSearch = globalSearch;
exports.searchSuggestions = searchSuggestions;
const prisma_1 = require("../../lib/prisma");
/*
|--------------------------------------------------------------------------
| Search Events
|--------------------------------------------------------------------------
|
| Shared by:
| - Web discovery
| - Web search
| - Attendee app
|
| Only published and public events are searchable.
|
*/
async function searchEvents(q, limit = 20) {
    const query = q.trim();
    if (!query) {
        return [];
    }
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
    return prisma_1.prisma.event.findMany({
        where: {
            status: "PUBLISHED",
            isPublic: true,
            OR: [
                {
                    title: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
                {
                    description: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
                {
                    venue: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
            ],
        },
        select: {
            id: true,
            title: true,
            description: true,
            venue: true,
            coverImage: true,
            featuredImage: true,
            category: true,
            capacity: true,
            currency: true,
            startDate: true,
            endDate: true,
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
        take: safeLimit,
    });
}
/*
|--------------------------------------------------------------------------
| Search Organizations
|--------------------------------------------------------------------------
|
| Used by global search.
|
*/
async function searchOrganizations(q, limit = 10) {
    const query = q.trim();
    if (!query) {
        return [];
    }
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 20);
    return prisma_1.prisma.organization.findMany({
        where: {
            name: {
                contains: query,
                mode: "insensitive",
            },
        },
        select: {
            id: true,
            name: true,
            logo: true,
            website: true,
        },
        orderBy: {
            name: "asc",
        },
        take: safeLimit,
    });
}
/*
|--------------------------------------------------------------------------
| Global Search
|--------------------------------------------------------------------------
|
| GET /search?q=...
|
| Searches:
| - Events
| - Organizations
|
| This remains compatible with the existing
| attendee app response structure.
|
*/
async function globalSearch(q, limit = 20) {
    const query = q.trim();
    if (!query) {
        return {
            success: true,
            events: [],
            organizations: [],
        };
    }
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
    const [events, organizations,] = await Promise.all([
        searchEvents(query, safeLimit),
        searchOrganizations(query, Math.min(safeLimit, 10)),
    ]);
    return {
        success: true,
        events,
        organizations,
    };
}
/*
|--------------------------------------------------------------------------
| Search Suggestions
|--------------------------------------------------------------------------
|
| GET /search/suggestions?q=...
|
| Lightweight autocomplete search.
|
| Important:
| Keep:
|
| {
|   id,
|   title,
|   type
| }
|
| stable because both web and app can consume it.
|
*/
async function searchSuggestions(q) {
    const query = q.trim();
    if (!query ||
        query.length < 2) {
        return {
            success: true,
            suggestions: [],
        };
    }
    const [events, organizations,] = await Promise.all([
        prisma_1.prisma.event.findMany({
            where: {
                status: "PUBLISHED",
                isPublic: true,
                title: {
                    contains: query,
                    mode: "insensitive",
                },
            },
            select: {
                id: true,
                title: true,
            },
            orderBy: {
                startDate: "asc",
            },
            take: 10,
        }),
        prisma_1.prisma.organization.findMany({
            where: {
                name: {
                    contains: query,
                    mode: "insensitive",
                },
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: "asc",
            },
            take: 5,
        }),
    ]);
    return {
        success: true,
        suggestions: [
            ...events.map((event) => ({
                id: event.id,
                title: event.title,
                type: "event",
            })),
            ...organizations.map((organization) => ({
                id: organization.id,
                title: organization.name,
                type: "organization",
            })),
        ],
    };
}
