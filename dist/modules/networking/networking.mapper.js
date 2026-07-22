"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkingMapper = void 0;
class NetworkingMapper {
    static toNetworkingProfile(user) {
        const profile = user.attendeeProfile;
        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            profession: profile.profession ??
                undefined,
            industry: profile.industry ??
                undefined,
            company: profile.company ??
                undefined,
            jobTitle: profile.jobTitle ??
                undefined,
            bio: profile.bio ??
                undefined,
            avatar: profile.avatar ??
                undefined,
            linkedin: profile.linkedin ??
                undefined,
            skills: this.toStringArray(profile.skills),
            goals: this.toStringArray(profile.goals),
        };
    }
    static toMatchCard(profile, evaluation) {
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
    static toStringArray(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value
            .filter((item) => typeof item ===
            "string")
            .map((item) => item.trim())
            .filter(Boolean);
    }
}
exports.NetworkingMapper = NetworkingMapper;
