"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProfile = createProfile;
exports.getMyProfile = getMyProfile;
exports.updateProfile = updateProfile;
const prisma_1 = require("../../lib/prisma");
/*
|--------------------------------------------------------------------------
| Create Profile
|--------------------------------------------------------------------------
*/
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
            company: data.company,
            jobTitle: data.jobTitle,
            linkedin: data.linkedin,
            goals: data.goals,
            skills: data.skills,
            bio: data.bio,
        },
    });
}
/*
|--------------------------------------------------------------------------
| Get My Profile
|--------------------------------------------------------------------------
*/
async function getMyProfile(userId) {
    return prisma_1.prisma.attendeeProfile.findUnique({
        where: {
            userId,
        },
    });
}
/*
|--------------------------------------------------------------------------
| Update Profile
|--------------------------------------------------------------------------
*/
async function updateProfile(userId, data) {
    return prisma_1.prisma.attendeeProfile.update({
        where: {
            userId,
        },
        data: {
            profession: data.profession,
            industry: data.industry,
            company: data.company,
            jobTitle: data.jobTitle,
            linkedin: data.linkedin,
            goals: data.goals,
            skills: data.skills,
            bio: data.bio,
        },
    });
}
