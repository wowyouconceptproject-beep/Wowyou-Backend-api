"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.access = access;
const prisma_1 = require("../../lib/prisma");
const ops_jwt_1 = require("./ops.jwt");
async function access(accessCode, device) {
    const staff = await prisma_1.prisma.eventStaff.findUnique({
        where: {
            accessCode,
        },
        include: {
            event: true,
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
        throw new Error("This event is not available.");
    }
    const token = (0, ops_jwt_1.generateOpsToken)({
        staffId: staff.id,
        eventId: staff.eventId,
        role: staff.role,
        station: staff.station,
        permissions: staff.permissions,
    });
    await prisma_1.prisma.$transaction(async (tx) => {
        // End any existing active sessions
        await tx.operationSession.updateMany({
            where: {
                staffId: staff.id,
                isActive: true,
            },
            data: {
                isActive: false,
                endedAt: new Date(),
            },
        });
        // Create new session
        await tx.operationSession.create({
            data: {
                staffId: staff.id,
                token,
                deviceId: device.deviceId,
                deviceName: device.deviceName,
                ipAddress: device.ipAddress,
            },
        });
        // Update last used time
        await tx.eventStaff.update({
            where: {
                id: staff.id,
            },
            data: {
                lastUsedAt: new Date(),
            },
        });
    });
    return {
        token,
        staff: {
            id: staff.id,
            name: staff.name,
            role: staff.role,
            station: staff.station,
            permissions: staff.permissions,
        },
        event: {
            id: staff.event.id,
            title: staff.event.title,
            venue: staff.event.venue,
            startDate: staff.event.startDate,
            endDate: staff.event.endDate,
            status: staff.event.status,
        },
    };
}
