"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStaff = createStaff;
exports.listStaff = listStaff;
exports.getStaff = getStaff;
exports.regenerateAccessCode = regenerateAccessCode;
exports.disableStaff = disableStaff;
exports.verifyAccessCode = verifyAccessCode;
const prisma_1 = require("../../lib/prisma");
const staff_utils_1 = require("./staff.utils");
const staff_permissions_1 = require("./staff.permissions");
/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/
async function getOwnedEvent(organizerId, eventId) {
    const event = await prisma_1.prisma.event.findUnique({
        where: {
            id: eventId,
        },
        include: {
            organization: true,
        },
    });
    if (!event) {
        throw new Error("Event not found.");
    }
    if (event.organization.ownerId !==
        organizerId) {
        throw new Error("Unauthorized.");
    }
    return event;
}
async function getOwnedStaff(organizerId, staffId) {
    const staff = await prisma_1.prisma.eventStaff.findUnique({
        where: {
            id: staffId,
        },
        include: {
            event: {
                include: {
                    organization: true,
                },
            },
        },
    });
    if (!staff) {
        throw new Error("Staff not found.");
    }
    if (staff.event.organization.ownerId !==
        organizerId) {
        throw new Error("Unauthorized.");
    }
    return staff;
}
/*
|--------------------------------------------------------------------------
| Create Staff
|--------------------------------------------------------------------------
*/
async function createStaff(organizerId, eventId, data) {
    await getOwnedEvent(organizerId, eventId);
    const accessCode = await (0, staff_utils_1.generateAccessCode)();
    const permissions = (0, staff_permissions_1.defaultPermissions)(data.role);
    const staff = await prisma_1.prisma.eventStaff.create({
        data: {
            eventId,
            name: data.name,
            phone: data.phone,
            email: data.email,
            role: data.role,
            station: data.station,
            accessCode,
            permissions,
            invitedBy: organizerId,
        },
    });
    return {
        staff,
        accessCode,
    };
}
/*
|--------------------------------------------------------------------------
| List Staff
|--------------------------------------------------------------------------
*/
async function listStaff(organizerId, eventId) {
    await getOwnedEvent(organizerId, eventId);
    return prisma_1.prisma.eventStaff.findMany({
        where: {
            eventId,
        },
        orderBy: {
            createdAt: "asc",
        },
    });
}
/*
|--------------------------------------------------------------------------
| Get Staff
|--------------------------------------------------------------------------
*/
async function getStaff(organizerId, staffId) {
    return getOwnedStaff(organizerId, staffId);
}
/*
|--------------------------------------------------------------------------
| Regenerate Access Code
|--------------------------------------------------------------------------
*/
async function regenerateAccessCode(organizerId, staffId) {
    const staff = await getOwnedStaff(organizerId, staffId);
    const accessCode = await (0, staff_utils_1.generateAccessCode)();
    const updated = await prisma_1.prisma.eventStaff.update({
        where: {
            id: staff.id,
        },
        data: {
            accessCode,
            lastUsedAt: null,
        },
    });
    return {
        staff: updated,
        accessCode,
    };
}
/*
|--------------------------------------------------------------------------
| Disable Staff
|--------------------------------------------------------------------------
*/
async function disableStaff(organizerId, staffId) {
    const staff = await getOwnedStaff(organizerId, staffId);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.eventStaff.update({
            where: {
                id: staff.id,
            },
            data: {
                isActive: false,
                isRevoked: true,
            },
        }),
        prisma_1.prisma.operationSession.updateMany({
            where: {
                staffId: staff.id,
                isActive: true,
            },
            data: {
                isActive: false,
                endedAt: new Date(),
            },
        }),
    ]);
    return {
        success: true,
    };
}
/*
|--------------------------------------------------------------------------
| Verify Access Code
|--------------------------------------------------------------------------
*/
async function verifyAccessCode(accessCode) {
    const staff = await prisma_1.prisma.eventStaff.findUnique({
        where: {
            accessCode,
        },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    venue: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                },
            },
        },
    });
    if (!staff) {
        throw new Error("Invalid access code.");
    }
    if (!staff.isActive) {
        throw new Error("Staff account has been disabled.");
    }
    if (staff.isRevoked) {
        throw new Error("Access code has been revoked.");
    }
    if (staff.expiresAt &&
        staff.expiresAt < new Date()) {
        throw new Error("Access code has expired.");
    }
    if (staff.event.status !==
        "PUBLISHED") {
        throw new Error("Event is not available.");
    }
    await prisma_1.prisma.eventStaff.update({
        where: {
            id: staff.id,
        },
        data: {
            lastUsedAt: new Date(),
        },
    });
    return staff;
}
