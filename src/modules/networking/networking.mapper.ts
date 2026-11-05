
import { Prisma } from "@prisma/client";

import {
  MatchCard,
  MatchEvaluation,
  NetworkingProfile,
} from "./networking.types";

import { normalize } from "./networking.utils";

export type AttendeeWithProfile =
  Prisma.UserGetPayload<{
    include: {
      attendeeProfile: true;
    };
  }>;

export class NetworkingMapper {
  static toNetworkingProfile(
    user: AttendeeWithProfile,
  ): NetworkingProfile {
    const profile = user.attendeeProfile;

    if (!profile) {
      throw new Error(
        `Attendee profile not found for user ${user.id}`,
      );
    }

    return {
      id: user.id,

      firstName: user.firstName,

      lastName: user.lastName,

      profession: profile.profession ?? undefined,

      industry: profile.industry ?? undefined,

      company: profile.company ?? undefined,

      jobTitle: profile.jobTitle ?? undefined,

      bio: profile.bio ?? undefined,

      avatar: profile.avatar ?? undefined,

      linkedin: profile.linkedin ?? undefined,

      skills: this.toStringArray(profile.skills),

      goals: this.toStringArray(profile.goals),
    };
  }

  static toMatchCard(
    profile: NetworkingProfile,
    evaluation: MatchEvaluation,
  ): MatchCard {
    return {
      userId: profile.id,

      firstName: profile.firstName,

      lastName: profile.lastName,

      profession: profile.profession,

      company: profile.company,

      jobTitle: profile.jobTitle,

      avatar: profile.avatar,

      score: evaluation.score,

      reasons: evaluation.reasons,
    };
  }

  private static toStringArray(
    value: Prisma.JsonValue | null,
  ): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return normalize(
      value.filter(
        (item): item is string =>
          typeof item === "string",
      ),
    );
  }
}
