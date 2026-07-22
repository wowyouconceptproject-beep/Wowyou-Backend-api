import { prisma } from "../../lib/prisma";

import { NetworkingAI } from "./networking.ai";
import { NetworkingMapper } from "./networking.mapper";
import { NetworkingMatcher } from "./networking.matcher";

import { MatchCard } from "./networking.types";

export class NetworkingService {
  private readonly matcher =
    new NetworkingMatcher();

  private readonly ai =
    new NetworkingAI();

  async getMatches(
    userId: string,
    eventId: string,
    limit = 20,
  ): Promise<MatchCard[]> {
    const attendee =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          attendeeProfile: true,
        },
      });

    if (!attendee) {
      throw new Error(
        "User not found.",
      );
    }

    if (!attendee.attendeeProfile) {
      throw new Error(
        "Attendee profile not found.",
      );
    }

    const registrations =
      await prisma.registration.findMany({
        where: {
          eventId,
          userId: {
            not: userId,
          },
        },
        include: {
          user: {
            include: {
              attendeeProfile: true,
            },
          },
        },
      });

    const me =
      NetworkingMapper.toNetworkingProfile(
        attendee,
      );

    const matches =
      registrations
        .map((registration) => registration.user)
        .filter(
          (candidate) =>
            candidate.attendeeProfile !==
            null,
        )
        .map((candidate) => {
          const profile =
            NetworkingMapper.toNetworkingProfile(
              candidate,
            );

          const evaluation =
            this.matcher.evaluate(
              me,
              profile,
            );

          return NetworkingMapper.toMatchCard(
            profile,
            evaluation,
          );
        })
        .sort(
          (a, b) =>
            b.score - a.score,
        )
        .slice(0, limit);

    try {
      const explanations =
        await this.ai.generateExplanations(
          me,
          matches,
        );

      const explanationMap =
        new Map(
          explanations.map(
            (item) => [
              item.userId,
              item.explanation,
            ],
          ),
        );

      return matches.map((match) => ({
        ...match,
        explanation:
          explanationMap.get(
            match.userId,
          ) ??
          "This attendee appears to be a strong professional connection based on your shared background and networking goals.",
      }));
    } catch (error) {
      console.error(
        "Failed to generate networking explanations:",
        error,
      );

      return matches;
    }
  }
}