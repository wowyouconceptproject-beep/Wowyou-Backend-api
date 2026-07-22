"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
const prisma_1 = require("../../lib/prisma");
async function getSettings(userId) {
    let settings = await prisma_1.prisma.userSettings.findUnique({
        where: {
            userId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                },
            },
        },
    });
    if (!settings) {
        settings =
            await prisma_1.prisma.userSettings.create({
                data: {
                    userId,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            role: true,
                        },
                    },
                },
            });
    }
    return settings;
}
async function updateSettings(userId, body) {
    const settings = await prisma_1.prisma.userSettings.upsert({
        where: {
            userId,
        },
        update: {
            avatar: body.avatar,
            bio: body.bio,
            pushNotifications: body.pushNotifications,
            emailNotifications: body.emailNotifications,
            smsNotifications: body.smsNotifications,
        },
        create: {
            userId,
            avatar: body.avatar,
            bio: body.bio,
            pushNotifications: body.pushNotifications ??
                true,
            emailNotifications: body.emailNotifications ??
                true,
            smsNotifications: body.smsNotifications ??
                false,
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                },
            },
        },
    });
    return settings;
}
