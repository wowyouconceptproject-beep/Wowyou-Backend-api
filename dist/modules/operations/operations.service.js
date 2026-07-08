"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.access = access;
exports.verifyPass = verifyPass;
exports.checkIn = checkIn;
exports.manualCheckIn = manualCheckIn;
exports.dashboard = dashboard;
exports.undoCheckIn = undoCheckIn;
exports.searchAttendee = searchAttendee;
const pass_jwt_1 = require("../pass/pass.jwt");
const prisma_1 = require("../../lib/prisma");
const ops_jwt_1 = require("./ops.jwt");
const realtime_1 = require("../../realtime");
const realtime_2 = require("../../realtime");
const event_bus_1 = require("../../core/events/event-bus");
const event_types_1 = require("../../core/events/event.types");
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
        // Close any previous sessions
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
        // Update last activity
        await tx.eventStaff.update({
            where: {
                id: staff.id,
            },
            data: {
                lastUsedAt: new Date(),
            },
        });
    });
    // Emit realtime event AFTER transaction succeeds
    (0, realtime_1.staffOnline)({
        eventId: staff.eventId,
        id: staff.id,
        name: staff.name,
        role: staff.role,
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
/*
|--------------------------------------------------------------------------
| Verify Pass
|--------------------------------------------------------------------------
*/
async function verifyPass(token, eventId) {
    const payload = (0, pass_jwt_1.verifyPassToken)(token);
    if (payload.eventId !== eventId) {
        throw new Error("This pass belongs to another event.");
    }
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: payload.purchaseId,
        },
        include: {
            user: true,
            ticket: true,
            event: true,
            checkIn: {
                include: {
                    staff: true,
                },
            },
        },
    });
    if (!purchase) {
        throw new Error("Pass not found.");
    }
    if (purchase.status !== "PAID") {
        throw new Error("Ticket has not been paid.");
    }
    return {
        purchase,
        alreadyCheckedIn: purchase.checkedIn,
        checkedInBy: purchase.checkIn
            ? {
                id: purchase.checkIn.staff.id,
                name: purchase.checkIn.staff.name,
                station: purchase.checkIn.station,
                checkedInAt: purchase.checkIn.checkedInAt,
            }
            : null,
    };
}
/*
|--------------------------------------------------------------------------
| Complete Check In (Private)
|--------------------------------------------------------------------------
*/
async function completeCheckIn(purchaseId, staff) {
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: purchaseId,
        },
        include: {
            user: true,
            ticket: true,
            event: true,
        },
    });
    if (!purchase) {
        throw new Error("Purchase not found.");
    }
    if (purchase.eventId !== staff.eventId) {
        throw new Error("Invalid event.");
    }
    if (purchase.status !== "PAID") {
        throw new Error("Ticket has not been paid.");
    }
    if (purchase.checkedIn) {
        throw new Error("Attendee has already checked in.");
    }
    const now = new Date();
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.ticketPurchase.update({
            where: {
                id: purchase.id,
            },
            data: {
                checkedIn: true,
                checkedInAt: now,
            },
        }),
        prisma_1.prisma.ticketCheckIn.create({
            data: {
                purchaseId: purchase.id,
                checkedInBy: staff.id,
                station: staff.station,
            },
        }),
        prisma_1.prisma.eventActivity.create({
            data: {
                eventId: purchase.eventId,
                actorId: staff.id,
                attendeeId: purchase.userId,
                purchaseId: purchase.id,
                ticketTypeId: purchase.ticketTypeId,
                station: staff.station,
                type: "CHECK_IN",
                title: "Attendee Checked In",
                description: `${purchase.user.firstName} ${purchase.user.lastName} checked in.`,
            },
        }),
    ]);
    const checkedIn = await prisma_1.prisma.ticketPurchase.count({
        where: {
            eventId: purchase.eventId,
            checkedIn: true,
        },
    });
    const totalTickets = await prisma_1.prisma.ticketPurchase.count({
        where: {
            eventId: purchase.eventId,
            status: "PAID",
        },
    });
    (0, realtime_2.attendanceUpdated)({
        eventId: purchase.eventId,
        checkedIn,
        totalTickets,
        remaining: totalTickets -
            checkedIn,
        purchaseId: purchase.id,
        attendeeId: purchase.userId,
        ticketTypeId: purchase.ticketTypeId,
        staffId: staff.id,
        checkedInAt: now.toISOString(),
    });
    (0, realtime_2.activityCreated)({
        type: realtime_2.ActivityType.CHECK_IN,
        eventId: purchase.eventId,
        title: "Attendee Checked In",
        description: `${purchase.user.firstName} ${purchase.user.lastName} checked in.`,
        staffId: staff.id,
        attendeeId: purchase.userId,
        timestamp: now.toISOString(),
    });
    (0, realtime_2.notifyAttendee)(purchase.userId, {
        type: "CHECK_IN_SUCCESS",
        title: "Welcome!",
        message: "You have successfully checked in.",
        eventId: purchase.eventId,
        purchaseId: purchase.id,
        checkedInAt: now.toISOString(),
    });
    event_bus_1.eventBus.emit(event_types_1.Events.ATTENDEE_CHECKED_IN, {
        eventId: purchase.eventId,
        purchaseId: purchase.id,
        attendeeId: purchase.userId,
        ticketTypeId: purchase.ticketTypeId,
        staffId: staff.id,
        station: staff.station,
        attendance: checkedIn,
        checkedInAt: now,
    });
    return {
        success: true,
        attendance: checkedIn,
        totalTickets,
        remaining: totalTickets -
            checkedIn,
        attendee: {
            id: purchase.user.id,
            firstName: purchase.user.firstName,
            lastName: purchase.user.lastName,
            email: purchase.user.email,
        },
        ticket: {
            id: purchase.ticket.id,
            name: purchase.ticket.name,
            price: purchase.ticket.price,
        },
        event: {
            id: purchase.event.id,
            title: purchase.event.title,
            currency: purchase.event.currency,
        },
    };
}
/*
|--------------------------------------------------------------------------
| QR Check In
|--------------------------------------------------------------------------
*/
async function checkIn(token, staff) {
    const payload = (0, pass_jwt_1.verifyPassToken)(token);
    if (payload.eventId !== staff.eventId) {
        throw new Error("This ticket belongs to another event.");
    }
    return completeCheckIn(payload.purchaseId, staff);
}
/*
|--------------------------------------------------------------------------
| Manual Check In
|--------------------------------------------------------------------------
*/
async function manualCheckIn(purchaseId, staff) {
    return completeCheckIn(purchaseId, staff);
}
/*
|--------------------------------------------------------------------------
| Operations Dashboard
|--------------------------------------------------------------------------
*/
async function dashboard(eventId) {
    const [event, checkedIn, totalTickets, onlineStaff, recentActivity,] = await Promise.all([
        prisma_1.prisma.event.findUnique({
            where: {
                id: eventId,
            },
            select: {
                id: true,
                title: true,
                venue: true,
                coverImage: true,
                capacity: true,
                currency: true,
                startDate: true,
                endDate: true,
                status: true,
            },
        }),
        prisma_1.prisma.ticketPurchase.count({
            where: {
                eventId,
                checkedIn: true,
            },
        }),
        prisma_1.prisma.ticketPurchase.count({
            where: {
                eventId,
                status: "PAID",
            },
        }),
        prisma_1.prisma.operationSession.count({
            where: {
                isActive: true,
                staff: {
                    eventId,
                },
            },
        }),
        prisma_1.prisma.eventActivity.findMany({
            where: {
                eventId,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 20,
        }),
    ]);
    if (!event) {
        throw new Error("Event not found.");
    }
    return {
        event,
        attendance: {
            checkedIn,
            totalTickets,
            remaining: Math.max(totalTickets -
                checkedIn, 0),
            capacity: event.capacity,
        },
        onlineStaff,
        recentActivity,
    };
}
/*
|--------------------------------------------------------------------------
| Undo Check In
|--------------------------------------------------------------------------
*/
async function undoCheckIn(purchaseId, staff) {
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: purchaseId,
        },
    });
    if (!purchase) {
        throw new Error("Purchase not found.");
    }
    if (purchase.eventId !==
        staff.eventId) {
        throw new Error("Invalid event.");
    }
    if (!purchase.checkedIn) {
        throw new Error("Attendee has not checked in.");
    }
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.ticketPurchase.update({
            where: {
                id: purchase.id,
            },
            data: {
                checkedIn: false,
                checkedInAt: null,
            },
        }),
        prisma_1.prisma.ticketCheckIn.delete({
            where: {
                purchaseId: purchase.id,
            },
        }),
        prisma_1.prisma.eventActivity.create({
            data: {
                eventId: purchase.eventId,
                actorId: staff.id,
                attendeeId: purchase.userId,
                purchaseId: purchase.id,
                ticketTypeId: purchase.ticketTypeId,
                type: "UNDO_CHECK_IN",
                title: "Check In Reversed",
                description: "Attendee check-in was reversed.",
            },
        }),
    ]);
    return {
        success: true,
    };
}
/*
|--------------------------------------------------------------------------
| Search Attendee
|--------------------------------------------------------------------------
*/
async function searchAttendee(eventId, query) {
    return prisma_1.prisma.ticketPurchase.findMany({
        where: {
            eventId,
            status: "PAID",
            OR: [
                {
                    user: {
                        firstName: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    user: {
                        lastName: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    user: {
                        email: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                },
            ],
        },
        include: {
            user: true,
            ticket: true,
            checkIn: true,
        },
        take: 20,
    });
}
