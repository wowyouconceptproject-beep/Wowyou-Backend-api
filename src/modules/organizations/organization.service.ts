import { prisma } from "../../lib/prisma";

export async function createOrganization(
  userId: string,
  name: string,
  slug: string
) {
  const existingOrganization =
    await prisma.organization.findUnique({
      where: {
        ownerId: userId,
      },
    });

  if (existingOrganization) {
    throw new Error(
      "You already have an organization"
    );
  }

  const existingSlug =
    await prisma.organization.findUnique({
      where: {
        slug,
      },
    });

  if (existingSlug) {
    throw new Error(
      "Slug already exists"
    );
  }

  return prisma.organization.create({
    data: {
      name,
      slug,
      ownerId: userId,
    },
  });
}

export async function getMyOrganization(
  userId: string
) {
  return prisma.organization.findUnique({
    where: {
      ownerId: userId,
    },
    include: {
      events: true,
    },
  });
}