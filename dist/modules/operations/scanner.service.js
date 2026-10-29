"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPass = verifyPass;
exports.checkIn = checkIn;
const prisma_1 = require("../../lib/prisma");
const pass_jwt_1 = require("../pass/pass.jwt");
const event_bus_1 = require("../../core/events/event-bus");
const event_types_1 = require("../../core/events/event.types");
async function resolveScannedPass(token, eventId) {
    const scannedToken = token.trim();
    if (!scannedToken) {
        throw new Error("Invalid ticket QR code.");
    }
    // Legacy QR: the original 64-character hexadecimal EventPass.qrToken.
    if (/^[a-fA-F0-9]{64}$/.test(scannedToken)) {
        const pass = await prisma_1.prisma.eventPass.findUnique({
            where: { qrToken: scannedToken },
            include: {
                purchase: {
                    include: {
                        user: true,
                        ticket: true,
                        event: true,
                    },
                },
            },
        });
        if (!pass) {
            throw new Error("Pass not found.");
        }
        const purchase = pass.purchase;
        if (purchase.eventId !== eventId) {
            throw new Error("This ticket belongs to another event.");
        }
        if (purchase.status !== "PAID") {
            throw new Error("Ticket has not been paid.");
        }
        if (!pass.isActive || pass.isRevoked) {
            throw new Error("This pass is inactive or revoked.");
        }
        if (pass.expiresAt && pass.expiresAt <= new Date()) {
            throw new Error("This pass has expired.");
        }
        return { purchase, pass };
    }
    // Existing signed JWT format.
    const payload = (0, pass_jwt_1.verifyPassToken)(scannedToken);
    if (payload.eventId !== eventId) {
        throw new Error("This ticket belongs to another event.");
    }
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: { id: payload.purchaseId },
        include: {
            user: true,
            ticket: true,
            event: true,
            passes: true,
        },
    });
    if (!purchase) {
        throw new Error("Pass not found.");
    }
    if (purchase.status !== "PAID") {
        throw new Error("Ticket has not been paid.");
    }
    const pass = purchase.passes.find((item) => item.isActive &&
        !item.isRevoked &&
        (!item.expiresAt || item.expiresAt > new Date()));
    if (!pass) {
        throw new Error("No active pass was found for this ticket.");
    }
    return { purchase, pass };
}
async function verifyPass(token, eventId) {
    const { purchase } = await resolveScannedPass(token, eventId);
    return {
        purchase,
        alreadyCheckedIn: purchase.checkedIn,
    };
}
async function checkIn(token, staff) {
    const { purchase } = await resolveScannedPass(token, staff.eventId);
    if (purchase.checkedIn) {
        throw new Error("Attendee has already checked in.");
    }
    await prisma_1.prisma.$transaction(async (tx) => {
        // Recheck inside the transaction to reduce duplicate check-in races.
        const current = await tx.ticketPurchase.findUnique({
            where: { id: purchase.id },
            select: { checkedIn: true, status: true },
        });
        if (!current || current.status !== "PAID") {
            throw new Error("Ticket has not been paid.");
        }
        if (current.checkedIn) {
            throw new Error("Attendee has already checked in.");
        }
        await tx.ticketPurchase.update({
            where: { id: purchase.id },
            data: {
                checkedIn: true,
                checkedInAt: new Date(),
            },
        });
        await tx.ticketCheckIn.create({
            data: {
                purchaseId: purchase.id,
                checkedInBy: staff.id,
                station: staff.station,
            },
        });
    });
    const attendance = await prisma_1.prisma.ticketPurchase.count({
        where: {
            eventId: purchase.eventId,
            checkedIn: true,
        },
    });
    const checkedInAt = new Date();
    event_bus_1.eventBus.emit(event_types_1.Events.ATTENDEE_CHECKED_IN, {
        eventId: purchase.eventId,
        purchaseId: purchase.id,
        attendeeId: purchase.userId,
        ticketTypeId: purchase.ticketTypeId,
        staffId: staff.id,
        station: staff.station,
        attendance,
        checkedInAt,
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
