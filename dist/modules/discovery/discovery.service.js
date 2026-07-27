"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiscoveryFeed = getDiscoveryFeed;
const prisma_1 = require("../../lib/prisma");
const discovery_constants_1 = require("./discovery.constants");
const discovery_mapper_1 = require("./discovery.mapper");
/*
|--------------------------------------------------------------------------
| Discovery Feed
|--------------------------------------------------------------------------
*/
async function getDiscoveryFeed() {
    const [hero, featured, trending, upcoming, categories,] = await Promise.all([
        getHeroEvents(),
        getFeaturedEvent(),
        getTrendingEvents(),
        getUpcomingEvents(),
        getCategories(),
    ]);
    return {
        hero,
        featured,
        categories,
        trending,
        upcoming,
        topVendors: [],
        vendorReviews: [],
    };
}
/*
|--------------------------------------------------------------------------
| Hero
|--------------------------------------------------------------------------
*/
async function getHeroEvents() {
    const events = await prisma_1.prisma.event.findMany({
        where: {
            status: "PUBLISHED",
            startDate: {
                gte: new Date(),
            },
        },
        orderBy: [
            {
                homepageScore: "desc",
            },
            {
                startDate: "asc",
            },
        ],
        take: discovery_constants_1.DISCOVERY.HERO_LIMIT,
    });
    return events.map(discovery_mapper_1.mapDiscoveryEvent);
}
/*
|--------------------------------------------------------------------------
| Featured Event
|--------------------------------------------------------------------------
*/
async function getFeaturedEvent() {
    const event = await prisma_1.prisma.event.findFirst({
        where: {
            status: "PUBLISHED",
            startDate: {
                gte: new Date(),
            },
        },
        orderBy: [
            {
                homepageScore: "desc",
            },
            {
                views: "desc",
            },
        ],
    });
    return event
        ? (0, discovery_mapper_1.mapDiscoveryEvent)(event)
        : null;
}
/*
|--------------------------------------------------------------------------
| Trending Events
|--------------------------------------------------------------------------
*/
async function getTrendingEvents() {
    const events = await prisma_1.prisma.event.findMany({
        where: {
            status: "PUBLISHED",
            startDate: {
                gte: new Date(),
            },
        },
        orderBy: [
            {
                homepageScore: "desc",
            },
            {
                views: "desc",
            },
        ],
        take: discovery_constants_1.DISCOVERY.TRENDING_LIMIT,
    });
    return events.map(discovery_mapper_1.mapDiscoveryEvent);
}
/*
|--------------------------------------------------------------------------
| Upcoming Events
|--------------------------------------------------------------------------
*/
async function getUpcomingEvents() {
    const events = await prisma_1.prisma.event.findMany({
        where: {
            status: "PUBLISHED",
            startDate: {
                gte: new Date(),
            },
        },
        orderBy: {
            startDate: "asc",
        },
        take: discovery_constants_1.DISCOVERY.UPCOMING_LIMIT,
    });
    return events.map(discovery_mapper_1.mapDiscoveryEvent);
}
/*
|--------------------------------------------------------------------------
| Categories
|--------------------------------------------------------------------------
*/
async function getCategories() {
    const categories = await prisma_1.prisma.event.groupBy({
        by: [
            "category",
        ],
        where: {
            status: "PUBLISHED",
        },
        _count: {
            category: true,
        },
        orderBy: {
            _count: {
                category: "desc",
            },
        },
    });
    return categories
        .filter((item) => item.category !==
        null)
        .map((item) => ({
        category: item.category,
        totalEvents: item._count
            .category,
    }));
}
