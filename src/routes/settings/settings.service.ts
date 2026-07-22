import { prisma } from "../../lib/prisma";

export async function getSettings(
  userId: string,
) {
  let settings =
    await prisma.userSettings.findUnique({
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
      await prisma.userSettings.create({
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

export async function updateSettings(
  userId: string,
  body: any,
) {
  const settings =
    await prisma.userSettings.upsert({
      where: {
        userId,
      },
      update: {
        avatar: body.avatar,
        bio: body.bio,
        pushNotifications:
          body.pushNotifications,
        emailNotifications:
          body.emailNotifications,
        smsNotifications:
          body.smsNotifications,
      },
      create: {
        userId,
        avatar: body.avatar,
        bio: body.bio,
        pushNotifications:
          body.pushNotifications ??
          true,
        emailNotifications:
          body.emailNotifications ??
          true,
        smsNotifications:
          body.smsNotifications ??
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