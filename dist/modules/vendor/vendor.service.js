"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplication = createApplication;
exports.listApplications = listApplications;
exports.listEventApplications = listEventApplications;
exports.getApplication = getApplication;
exports.approveApplication = approveApplication;
exports.rejectApplication = rejectApplication;
exports.withdrawApplication = withdrawApplication;
const prisma_1 = require("../../lib/prisma");
/*
|--------------------------------------------------------------------------
| Create Application
|--------------------------------------------------------------------------
*/
async function createApplication(data) {
    const event = await prisma_1.prisma.event.findUnique({
        where: {
            id: data.eventId,
        },
    });
    if (!event) {
        throw new Error("Event not found.");
    }
    const existing = await prisma_1.prisma.vendorApplication.findFirst({
        where: {
            eventId: data.eventId,
            email: data.email,
            status: {
                not: "REJECTED",
            },
        },
    });
    if (existing) {
        throw new Error("You have already applied for this event.");
    }
    return prisma_1.prisma.vendorApplication.create({
        data: {
            eventId: data.eventId,
            vendorId: null,
            businessName: data.businessName,
            category: data.category,
            contactName: data.contactName,
            email: data.email,
            phone: data.phone,
            description: data.description,
            boothSize: data.boothSize,
            message: data.message,
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
async function listApplications(email) {
    return prisma_1.prisma.vendorApplication.findMany({
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
async function listEventApplications(eventId) {
    return prisma_1.prisma.vendorApplication.findMany({
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
async function getApplication(id) {
    return prisma_1.prisma.vendorApplication.findUnique({
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
async function approveApplication(id) {
    return prisma_1.prisma.vendorApplication.update({
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
async function rejectApplication(id) {
    return prisma_1.prisma.vendorApplication.update({
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
async function withdrawApplication(id) {
    return prisma_1.prisma.vendorApplication.delete({
        where: {
            id,
        },
    });
}
