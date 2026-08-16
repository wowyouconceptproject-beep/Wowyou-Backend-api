import { prisma } from "../../lib/prisma";

import {
  createOrganizationTrial,
} from "../billing/billing.service";

import {
  OrganizerPlan,
} from "@prisma/client";

/*
|--------------------------------------------------------------------------
| Create Organization
|--------------------------------------------------------------------------
*/

export async function createOrganization(
  userId: string,
  name: string,
  slug: string,
  plan: OrganizerPlan =
    OrganizerPlan.STARTER,
) {
  const existingOrganization =
    await prisma.organization.findUnique({
      where: {
        ownerId: userId,
      },
    });

  if (existingOrganization) {
    throw new Error(
      "You already have an organization.",
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
      "Slug already exists.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Create Organization
  |--------------------------------------------------------------------------
  */

  const organization =
    await prisma.organization.create({
      data: {
        name,
        slug,
        ownerId: userId,
      },
    });

  /*
  |--------------------------------------------------------------------------
  | Start 14-Day Organizer Trial
  |--------------------------------------------------------------------------
  */

  await createOrganizationTrial(
    organization.id,
    plan,
  );

  return organization;
}

/*
|--------------------------------------------------------------------------
| Get My Organization
|--------------------------------------------------------------------------
*/

export async function getMyOrganization(
  userId: string,
) {
  return prisma.organization.findUnique({
    where: {
      ownerId: userId,
    },

    include: {
      events: true,
      subscription: true,
    },
  });
}