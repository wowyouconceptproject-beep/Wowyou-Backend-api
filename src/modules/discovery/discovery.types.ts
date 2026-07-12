import { EventCategory } from "@prisma/client";

export interface DiscoveryEvent {
  id: string;

  title: string;

  slug: string;

  coverImage: string | null;

  featuredImage: string | null;

  venue: string;

  city: string;

  state: string;

  startDate: Date;

  endDate: Date;

  category: EventCategory | null;

  homepageScore: number;

  views: number;

  wishlistCount: number;

  shareCount: number;
}

export interface DiscoveryCategory {
  category: EventCategory;

  totalEvents: number;
}

export interface DiscoveryResponse {
  hero: DiscoveryEvent[];

  featured: DiscoveryEvent | null;

  categories: DiscoveryCategory[];

  trending: DiscoveryEvent[];

  upcoming: DiscoveryEvent[];

  topVendors: any[];

  vendorReviews: any[];
}