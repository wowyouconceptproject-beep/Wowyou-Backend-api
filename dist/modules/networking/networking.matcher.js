"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkingMatcher = void 0;
const networking_utils_1 = require("./networking.utils");
const DEFAULT_WEIGHTS = {
    skills: 35,
    goals: 30,
    profession: 15,
    industry: 15,
    company: 5,
};
class NetworkingMatcher {
    weights;
    constructor(weights = DEFAULT_WEIGHTS) {
        this.weights = weights;
    }
    evaluate(attendee, candidate) {
        const breakdown = this.calculateBreakdown(attendee, candidate);
        const score = (0, networking_utils_1.clamp)(Math.round(breakdown.skills +
            breakdown.goals +
            breakdown.profession +
            breakdown.industry +
            breakdown.company));
        return {
            score,
            reasons: this.buildReasons(breakdown),
        };
    }
    calculateBreakdown(attendee, candidate) {
        const skills = (0, networking_utils_1.overlapPercentage)(attendee.skills, candidate.skills) * this.weights.skills;
        const goals = (0, networking_utils_1.overlapPercentage)(attendee.goals, candidate.goals) * this.weights.goals;
        const profession = this.sameValue(attendee.profession, candidate.profession)
            ? this.weights.profession
            : 0;
        const industry = this.sameValue(attendee.industry, candidate.industry)
            ? this.weights.industry
            : 0;
        const company = this.sameValue(attendee.company, candidate.company)
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
    sameValue(a, b) {
        if (!a || !b)
            return false;
        return (a.trim().toLowerCase() ===
            b.trim().toLowerCase());
    }
    buildReasons(breakdown) {
        const reasons = [];
        if (breakdown.skills > 0) {
            reasons.push({
                code: "SKILLS",
                message: "You share professional skills.",
                weight: Math.round(breakdown.skills),
            });
        }
        if (breakdown.goals > 0) {
            reasons.push({
                code: "GOALS",
                message: "You have similar networking goals.",
                weight: Math.round(breakdown.goals),
            });
        }
        if (breakdown.profession > 0) {
            reasons.push({
                code: "PROFESSION",
                message: "You have the same profession.",
                weight: Math.round(breakdown.profession),
            });
        }
        if (breakdown.industry > 0) {
            reasons.push({
                code: "INDUSTRY",
                message: "You work in the same industry.",
                weight: Math.round(breakdown.industry),
            });
        }
        if (breakdown.company > 0) {
            reasons.push({
                code: "COMPANY",
                message: "You work at the same company.",
                weight: Math.round(breakdown.company),
            });
        }
        return reasons.sort((a, b) => b.weight - a.weight);
    }
}
exports.NetworkingMatcher = NetworkingMatcher;
