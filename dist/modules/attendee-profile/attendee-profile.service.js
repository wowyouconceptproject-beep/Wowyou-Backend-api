"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProfile = createProfile;
exports.getMyProfile = getMyProfile;
exports.updateProfile = updateProfile;
const prisma_1 = require("../../lib/prisma");
async function createProfile(userId, data) {
    const existing = await prisma_1.prisma.attendeeProfile.findUnique({
        where: {
            userId,
        },
    });
    if (existing) {
        throw new Error("Profile already exists");
    }
    return prisma_1.prisma.attendeeProfile.create({
        data: {
            userId,
            profession: data.profession,
            industry: data.industry,
            goals: data.goals,
            skills: data.skills,
            bio: data.bio,
        },
    });
}
async function getMyProfile(userId) {
    return prisma_1.prisma.attendeeProfile.findUnique({
        where: {
            userId,
        },
    });
}
async function updateProfile(userId, data) {
    return prisma_1.prisma.attendeeProfile.update({
        where: {
            userId,
        },
        data,
    });
}
