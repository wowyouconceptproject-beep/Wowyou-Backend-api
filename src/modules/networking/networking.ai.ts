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
    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return null;
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey,
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

    const client =
      this.getClient();

    if (!client) {
      return [];
    }

    try {
      const response =
        await client.chat.completions.create({
          model: "gpt-5-nano",
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content: `
You are an expert networking coach.

Return ONLY valid JSON.

Output format:

[
  {
    "userId": "...",
    "explanation": "..."
  }
]
`,
            },
            {
              role: "user",
              content: `
Attendee:
${JSON.stringify(me)}

Matches:
${JSON.stringify(matches)}

Generate one concise explanation (maximum two sentences) describing why each match would be valuable professionally.

Do not include markdown or any text outside the JSON array.
`,
            },
          ],
        });

      const content =
        response.choices[0].message.content;

      if (
        !content ||
        content.trim().length === 0
      ) {
        return [];
      }

      return JSON.parse(
        content,
      ) as AIExplanation[];
    } catch (error) {
      console.warn(
        "Networking AI unavailable:",
        error,
      );

      return [];
    }
  }
}