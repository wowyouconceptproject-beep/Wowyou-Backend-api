"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkingAI = void 0;
const openai_1 = __importDefault(require("openai"));
const client = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
class NetworkingAI {
    async generateExplanations(me, matches) {
        if (matches.length === 0) {
            return [];
        }
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
        if (!content) {
            return [];
        }
        try {
            return JSON.parse(content);
        }
        catch {
            return [];
        }
    }
}
exports.NetworkingAI = NetworkingAI;
