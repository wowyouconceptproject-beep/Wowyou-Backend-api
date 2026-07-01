"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPass = verifyPass;
exports.checkIn = checkIn;
exports.undoCheckIn = undoCheckIn;
exports.manualCheckIn = manualCheckIn;
exports.searchAttendee = searchAttendee;
const prisma_1 = require("../../lib/prisma");
const pass_jwt_1 = require("../pass/pass.jwt");
const event_bus_1 = require("../../core/events/event-bus");
const event_types_1 = require("../../core/events/event.types");
async function verifyPass(token, eventId) {
    const payload = (0, pass_jwt_1.verifyPassToken)(token);
    if (payload.eventId !== eventId) {
        throw new Error("This ticket belongs to another event.");
    }
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: payload.purchaseId,
        },
        include: {
            user: true,
            ticket: true,
            event: true,
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
    };
}
async function checkIn(token, staff) {
    const payload = (0, pass_jwt_1.verifyPassToken)(token);
    if (payload.eventId !==
        staff.eventId) {
        throw new Error("This ticket belongs to another event.");
    }
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: payload.purchaseId,
        },
        include: {
            event: true,
            user: true,
            ticket: true,
        },
    });
    if (!purchase) {
        throw new Error("Pass not found.");
    }
    if (purchase.status !==
        "PAID") {
        throw new Error("Ticket has not been paid.");
    }
    if (purchase.checkedIn) {
        throw new Error("Attendee has already checked in.");
    }
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.ticketPurchase.update({
            where: {
                id: purchase.id,
            },
            data: {
                checkedIn: true,
                checkedInAt: new Date(),
            },
        }),
        prisma_1.prisma.ticketCheckIn.create({
            data: {
                purchaseId: purchase.id,
                checkedInBy: staff.id,
                station: staff.station,
            },
        }),
    ]);
    const attendance = await prisma_1.prisma.ticketPurchase.count({
        where: {
            eventId: purchase.eventId,
            checkedIn: true,
        },
    });
    event_bus_1.eventBus.emit(event_types_1.Events.ATTENDEE_CHECKED_IN, {
        eventId: purchase.eventId,
        purchaseId: purchase.id,
        attendeeId: purchase.userId,
        ticketTypeId: purchase.ticketTypeId,
        staffId: staff.id,
        station: staff.station,
        attendance,
        checkedInAt: new Date(),
    });
    return {
        success: true,
        attendance,
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
        },
    };
}
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
    ]);
    event_bus_1.eventBus.emit(event_types_1.Events.ATTENDEE_UNCHECKED, {
        purchaseId: purchase.id,
        eventId: purchase.eventId,
        staffId: staff.id,
    });
    return {
        success: true,
    };
}
async function manualCheckIn(purchaseId, staff) {
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
    if (purchase.eventId !==
        staff.eventId) {
        throw new Error("Invalid event.");
    }
    if (purchase.checkedIn) {
        throw new Error("Attendee has already checked in.");
    }
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.ticketPurchase.update({
            where: {
                id: purchase.id,
            },
            data: {
                checkedIn: true,
                checkedInAt: new Date(),
            },
        }),
        prisma_1.prisma.ticketCheckIn.create({
            data: {
                purchaseId: purchase.id,
                checkedInBy: staff.id,
                station: staff.station,
            },
        }),
    ]);
    const attendance = await prisma_1.prisma.ticketPurchase.count({
        where: {
            eventId: purchase.eventId,
            checkedIn: true,
        },
    });
    event_bus_1.eventBus.emit(event_types_1.Events.ATTENDEE_CHECKED_IN, {
        eventId: purchase.eventId,
        purchaseId: purchase.id,
        attendeeId: purchase.userId,
        ticketTypeId: purchase.ticketTypeId,
        staffId: staff.id,
        station: staff.station,
        attendance,
        checkedInAt: new Date(),
    });
    return {
        success: true,
        attendance,
    };
}
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
        },
        take: 20,
    });
}
async function completeCheckIn(purchase, staff) {
    if (purchase.checkedIn) {
        throw new Error("Attendee has already checked in.");
    }
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.ticketPurchase.update({
            where: {
                id: purchase.id,
            },
            data: {
                checkedIn: true,
                checkedInAt: new Date(),
            },
        }),
        prisma_1.prisma.ticketCheckIn.create({
            data: {
                purchaseId: purchase.id,
                checkedInBy: staff.id,
                station: staff.station,
            },
        }),
    ]);
    const attendance = await prisma_1.prisma.ticketPurchase.count({
        where: {
            eventId: purchase.eventId,
            checkedIn: true,
        },
    });
    event_bus_1.eventBus.emit(event_types_1.Events.ATTENDEE_CHECKED_IN, {
        purchaseId: purchase.id,
        attendeeId: purchase.userId,
        eventId: purchase.eventId,
        ticketTypeId: purchase.ticketTypeId,
        staffId: staff.id,
        station: staff.station,
        attendance,
        checkedInAt: new Date(),
    });
    return {
        success: true,
        attendance,
        attendee: purchase.user,
        ticket: purchase.ticket,
        event: purchase.event,
    };
}
