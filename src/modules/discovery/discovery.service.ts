import { prisma } from "../../lib/prisma";

import { DISCOVERY } from "./discovery.constants";

import { mapDiscoveryEvent } from "./discovery.mapper";

/*
|--------------------------------------------------------------------------
| Discovery Feed
|--------------------------------------------------------------------------
*/

export async function getDiscoveryFeed() {
  const [
    hero,
    featured,
    trending,
    upcoming,
    categories,
  ] = await Promise.all([
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
  const events =
    await prisma.event.findMany({
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

      take:
        DISCOVERY.HERO_LIMIT,
    });

  return events.map(
    mapDiscoveryEvent,
  );
}

/*
|--------------------------------------------------------------------------
| Featured Event
|--------------------------------------------------------------------------
*/

async function getFeaturedEvent() {
  const event =
    await prisma.event.findFirst({
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
    ? mapDiscoveryEvent(
        event,
      )
    : null;
}

/*
|--------------------------------------------------------------------------
| Trending Events
|--------------------------------------------------------------------------
*/

async function getTrendingEvents() {
  const events =
    await prisma.event.findMany({
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

      take:
        DISCOVERY.TRENDING_LIMIT,
    });

  return events.map(
    mapDiscoveryEvent,
  );
}

/*
|--------------------------------------------------------------------------
| Upcoming Events
|--------------------------------------------------------------------------
*/

async function getUpcomingEvents() {
  const events =
    await prisma.event.findMany({
      where: {
        status: "PUBLISHED",

        startDate: {
          gte: new Date(),
        },
      },

      orderBy: {
        startDate: "asc",
      },

      take:
        DISCOVERY.UPCOMING_LIMIT,
    });

  return events.map(
    mapDiscoveryEvent,
  );
}

/*
|--------------------------------------------------------------------------
| Categories
|--------------------------------------------------------------------------
*/

async function getCategories() {
  const categories =
    await prisma.event.groupBy({
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
    .filter(
      (item) =>
        item.category !==
        null,
    )
    .map(
      (item) => ({
        category:
          item.category,

        totalEvents:
          item._count
            .category,
      }),
    );
}