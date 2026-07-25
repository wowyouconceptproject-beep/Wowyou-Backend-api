"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkingAI = void 0;
const openai_1 = __importDefault(require("openai"));
class NetworkingAI {
    client;
    getClient() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return null;
        }
        if (!this.client) {
            this.client = new openai_1.default({
                apiKey,
            });
        }
        return this.client;
    }
    async generateExplanations(me, matches) {
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
            const content = response.choices[0].message.content;
            if (!content ||
                content.trim().length === 0) {
                return [];
            }
            return JSON.parse(content);
        }
        catch (error) {
            console.warn("Networking AI unavailable:", error);
            return [];
        }
    }
}
exports.NetworkingAI = NetworkingAI;
