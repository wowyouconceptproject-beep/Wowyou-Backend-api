"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkingService = void 0;
const prisma_1 = require("../../lib/prisma");
const networking_ai_1 = require("./networking.ai");
const networking_mapper_1 = require("./networking.mapper");
const networking_matcher_1 = require("./networking.matcher");
class NetworkingService {
    matcher = new networking_matcher_1.NetworkingMatcher();
    ai = new networking_ai_1.NetworkingAI();
    async getMatches(userId, eventId, limit = 20) {
        const attendee = await prisma_1.prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                attendeeProfile: true,
            },
        });
        if (!attendee) {
            throw new Error("User not found.");
        }
        if (!attendee.attendeeProfile) {
            throw new Error("Attendee profile not found.");
        }
        const registrations = await prisma_1.prisma.registration.findMany({
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
        const me = networking_mapper_1.NetworkingMapper.toNetworkingProfile(attendee);
        const matches = registrations
            .map((registration) => registration.user)
            .filter((candidate) => candidate.attendeeProfile !==
            null)
            .map((candidate) => {
            const profile = networking_mapper_1.NetworkingMapper.toNetworkingProfile(candidate);
            const evaluation = this.matcher.evaluate(me, profile);
            return networking_mapper_1.NetworkingMapper.toMatchCard(profile, evaluation);
        })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        try {
            const explanations = await this.ai.generateExplanations(me, matches);
            const explanationMap = new Map(explanations.map((item) => [
                item.userId,
                item.explanation,
            ]));
            return matches.map((match) => ({
                ...match,
                explanation: explanationMap.get(match.userId) ??
                    "This attendee appears to be a strong professional connection based on your shared background and networking goals.",
            }));
        }
        catch (error) {
            console.error("Failed to generate networking explanations:", error);
            return matches;
        }
    }
}
exports.NetworkingService = NetworkingService;
