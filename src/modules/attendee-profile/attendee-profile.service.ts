import { prisma } from "../../lib/prisma";

export async function createProfile(
  userId: string,
  data: {
    profession?: string;
    industry?: string;
    goals?: any;
    skills?: any;
    bio?: string;
  }
) {
  const existing =
    await prisma.attendeeProfile.findUnique({
      where: {
        userId,
      },
    });

  if (existing) {
    throw new Error(
      "Profile already exists"
    );
  }

  return prisma.attendeeProfile.create({
    data: {
      userId,
      profession:
        data.profession,
      industry:
        data.industry,
      goals: data.goals,
      skills: data.skills,
      bio: data.bio,
    },
  });
}

export async function getMyProfile(
  userId: string
) {
  return prisma.attendeeProfile.findUnique({
    where: {
      userId,
    },
  });
}

export async function updateProfile(
  userId: string,
  data: {
    profession?: string;
    industry?: string;
    goals?: any;
    skills?: any;
    bio?: string;
  }
) {
  return prisma.attendeeProfile.update({
    where: {
      userId,
    },
    data,
  });
}