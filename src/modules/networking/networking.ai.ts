
import OpenAI from "openai";

import {
  MatchCard,
  NetworkingProfile,
} from "./networking.types";

export interface AIExplanation {
  userId: string;
  explanation: string;
}

export class NetworkingAI {
  private client?: OpenAI;

  private getClient(): OpenAI | null {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return null;
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey,
        timeout: 15000,
        maxRetries: 1,
      });
    }

    return this.client;
  }

  async generateExplanations(
    me: NetworkingProfile,
    matches: MatchCard[],
  ): Promise<AIExplanation[]> {
    if (matches.length === 0) {
      return [];
    }

    const client = this.getClient();

    if (!client) {
      return [];
    }

    try {
      const response = await client.chat.completions.create({
        model: "gpt-5-nano",
        temperature: 0.4,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: `
You are an expert professional networking coach.

Return a JSON object with an "explanations" array.

Each explanation must contain:
- userId: the exact supplied match userId
- explanation: a concise professional explanation

Rules:
- Maximum two sentences per explanation.
- Explain the potential professional value of the connection.
- Use only information supplied in the profiles and match reasons.
- Never invent shared interests, experience, skills, or opportunities.
- Avoid generic praise and exaggerated claims.
- Return an explanation for every supplied match.
`,
          },
          {
            role: "user",
            content: JSON.stringify({
              attendee: {
                profession: me.profession,
                industry: me.industry,
                skills: me.skills,
                goals: me.goals,
              },
              matches: matches.map((match) => ({
                userId: match.userId,
                firstName: match.firstName,
                profession: match.profession,
                company: match.company,
                jobTitle: match.jobTitle,
                score: match.score,
                reasons: match.reasons,
              })),
            }),
          },
        ],
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        return [];
      }

      const parsed = JSON.parse(content) as {
        explanations?: unknown;
      };

      if (!Array.isArray(parsed.explanations)) {
        return [];
      }

      const validUserIds = new Set(
        matches.map((match) => match.userId),
      );

      const explanations: AIExplanation[] =
        parsed.explanations.filter(
          (item): item is AIExplanation => {
            if (
              typeof item !== "object" ||
              item === null
            ) {
              return false;
            }

            const explanation =
              item as Record<string, unknown>;

            return (
              typeof explanation.userId === "string" &&
              validUserIds.has(explanation.userId) &&
              typeof explanation.explanation === "string" &&
              explanation.explanation.trim().length > 0
            );
          },
        );

      return explanations.map((item) => ({
        userId: item.userId,
        explanation: item.explanation.trim(),
      }));
    } catch (error) {
      console.warn(
        "Networking AI unavailable:",
        error,
      );

      return [];
    }
  }
}
