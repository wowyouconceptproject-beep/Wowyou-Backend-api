import {
  MatchBreakdown,
  MatchEvaluation,
  MatchReason,
  MatchWeights,
  NetworkingProfile,
} from "./networking.types";

import {
  clamp,
  overlapPercentage,
} from "./networking.utils";

const DEFAULT_WEIGHTS: MatchWeights = {
  skills: 35,
  goals: 30,
  profession: 15,
  industry: 15,
  company: 5,
};

export class NetworkingMatcher {
  constructor(
    private readonly weights: MatchWeights = DEFAULT_WEIGHTS,
  ) {}

  evaluate(
    attendee: NetworkingProfile,
    candidate: NetworkingProfile,
  ): MatchEvaluation {
    const breakdown =
      this.calculateBreakdown(
        attendee,
        candidate,
      );

    const score = clamp(
      Math.round(
        breakdown.skills +
            breakdown.goals +
            breakdown.profession +
            breakdown.industry +
            breakdown.company,
      ),
    );

    return {
      score,
      reasons: this.buildReasons(
        breakdown,
      ),
    };
  }

  private calculateBreakdown(
    attendee: NetworkingProfile,
    candidate: NetworkingProfile,
  ): MatchBreakdown {
    const skills =
      overlapPercentage(
        attendee.skills,
        candidate.skills,
      ) *
      this.weights.skills;

    const goals =
      overlapPercentage(
        attendee.goals,
        candidate.goals,
      ) *
      this.weights.goals;

    const profession =
      attendee.profession &&
      candidate.profession &&
      attendee.profession
          .trim()
          .toLowerCase() ===
          candidate.profession
              .trim()
              .toLowerCase()
          ? this.weights.profession
          : 0;

    const industry =
      attendee.industry &&
      candidate.industry &&
      attendee.industry
          .trim()
          .toLowerCase() ===
          candidate.industry
              .trim()
              .toLowerCase()
          ? this.weights.industry
          : 0;

    const company =
      attendee.company &&
      candidate.company &&
      attendee.company
          .trim()
          .toLowerCase() ===
          candidate.company
              .trim()
              .toLowerCase()
          ? this.weights.company
          : 0;

    return {
      skills,
      goals,
      profession,
      industry,
      company,
    };
  }

  private buildReasons(
    breakdown: MatchBreakdown,
  ): MatchReason[] {
    const reasons: MatchReason[] = [];

    if (breakdown.skills > 0) {
      reasons.push({
        code: "SKILLS",
        message:
          "You share complementary professional skills.",
        weight: Math.round(
          breakdown.skills,
        ),
      });
    }

    if (breakdown.goals > 0) {
      reasons.push({
        code: "GOALS",
        message:
          "You have similar networking goals.",
        weight: Math.round(
          breakdown.goals,
        ),
      });
    }

    if (breakdown.profession > 0) {
      reasons.push({
        code: "PROFESSION",
        message:
          "You have the same profession.",
        weight: Math.round(
          breakdown.profession,
        ),
      });
    }

    if (breakdown.industry > 0) {
      reasons.push({
        code: "INDUSTRY",
        message:
          "You work in the same industry.",
        weight: Math.round(
          breakdown.industry,
        ),
      });
    }

    if (breakdown.company > 0) {
      reasons.push({
        code: "COMPANY",
        message:
          "You work at the same company.",
        weight: Math.round(
          breakdown.company,
        ),
      });
    }

    return reasons.sort(
      (a, b) => b.weight - a.weight,
    );
  }
}