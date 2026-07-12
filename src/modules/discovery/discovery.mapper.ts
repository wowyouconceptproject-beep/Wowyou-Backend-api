import { Event } from "@prisma/client";

export function mapDiscoveryEvent(
  event: Event,
) {
  return {
    id: event.id,

    title: event.title,

    description:
      event.description,

    venue:
      event.venue,

    coverImage:
      event.coverImage,

    featuredImage:
      event.featuredImage,

    startDate:
      event.startDate,

    endDate:
      event.endDate,

    category:
      event.category,

    homepageScore:
      event.homepageScore,

    views:
      event.views,

    wishlistCount:
      event.wishlistCount,

    shareCount:
      event.shareCount,

    status:
      event.status,
  };
}