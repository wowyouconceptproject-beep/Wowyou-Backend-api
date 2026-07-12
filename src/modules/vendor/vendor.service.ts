import { prisma } from "../../lib/prisma";

import {
  CreateVendorApplication,
} from "./vendor.types";

/*
|--------------------------------------------------------------------------
| Create Application
|--------------------------------------------------------------------------
*/

export async function createApplication(
  data: CreateVendorApplication,
) {
  const event =
    await prisma.event.findUnique({
      where: {
        id: data.eventId,
      },
    });

  if (!event) {
    throw new Error(
      "Event not found.",
    );
  }

  const existing =
    await prisma.vendorApplication.findFirst({
      where: {
        eventId: data.eventId,
        email: data.email,
        status: {
          not: "REJECTED",
        },
      },
    });

  if (existing) {
    throw new Error(
      "You have already applied for this event.",
    );
  }

  return prisma.vendorApplication.create({
    data: {
      eventId: data.eventId,

      vendorId: null,

      businessName:
        data.businessName,

      category:
        data.category,

      contactName:
        data.contactName,

      email:
        data.email,

      phone:
        data.phone,

      description:
        data.description,

      boothSize:
        data.boothSize,

      message:
        data.message,
    },

    include: {
      event: {
        select: {
          id: true,
          title: true,
          venue: true,
          coverImage: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| My Applications
|--------------------------------------------------------------------------
*/

export async function listApplications(
  email: string,
) {
  return prisma.vendorApplication.findMany({
    where: {
      email,
    },

    include: {
      event: {
        select: {
          id: true,
          title: true,
          venue: true,
          coverImage: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

/*
|--------------------------------------------------------------------------
| Event Applications
|--------------------------------------------------------------------------
*/

export async function listEventApplications(
  eventId: string,
) {
  return prisma.vendorApplication.findMany({
    where: {
      eventId,
    },

    include: {
      event: {
        select: {
          id: true,
          title: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

/*
|--------------------------------------------------------------------------
| Get Application
|--------------------------------------------------------------------------
*/

export async function getApplication(
  id: string,
) {
  return prisma.vendorApplication.findUnique({
    where: {
      id,
    },

    include: {
      event: true,
    },
  });
}

/*
|--------------------------------------------------------------------------
| Approve
|--------------------------------------------------------------------------
*/

export async function approveApplication(
  id: string,
) {
  return prisma.vendorApplication.update({
    where: {
      id,
    },

    data: {
      status: "APPROVED",

      reviewedAt: new Date(),

      approvedAt: new Date(),

      rejectedAt: null,
    },

    include: {
      event: true,
    },
  });
}

/*
|--------------------------------------------------------------------------
| Reject
|--------------------------------------------------------------------------
*/

export async function rejectApplication(
  id: string,
) {
  return prisma.vendorApplication.update({
    where: {
      id,
    },

    data: {
      status: "REJECTED",

      reviewedAt: new Date(),

      rejectedAt: new Date(),

      approvedAt: null,
    },

    include: {
      event: true,
    },
  });
}

/*
|--------------------------------------------------------------------------
| Withdraw
|--------------------------------------------------------------------------
*/

export async function withdrawApplication(
  id: string,
) {
  return prisma.vendorApplication.delete({
    where: {
      id,
    },
  });
}