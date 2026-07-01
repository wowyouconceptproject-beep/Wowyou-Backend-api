"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventPass = getEventPass;
exports.generateSecurePass = generateSecurePass;
exports.verifySecurePass = verifySecurePass;
exports.checkInPass = checkInPass;
const prisma_1 = require("../../lib/prisma");
const pass_jwt_1 = require("./pass.jwt");
const realtime_1 = require("../../realtime");
async function getEventPass(purchaseId, userId) {
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: purchaseId,
        },
        include: {
            user: true,
            event: true,
            ticket: true,
        },
    });
    if (!purchase) {
        throw new Error("Pass not found.");
    }
    if (purchase.userId !== userId) {
        throw new Error("Unauthorized.");
    }
    return purchase;
}
async function generateSecurePass(purchaseId, userId) {
    const purchase = await getEventPass(purchaseId, userId);
    if (purchase.status !== "PAID") {
        throw new Error("Ticket has not been paid for.");
    }
    if (purchase.checkedIn) {
        throw new Error("This pass has already been used.");
    }
    if (purchase.event.endDate <
        new Date()) {
        throw new Error("Event has ended.");
    }
    const token = (0, pass_jwt_1.generatePassToken)({
        purchaseId: purchase.id,
        eventId: purchase.eventId,
        userId: purchase.userId,
    });
    return {
        token,
    };
}
async function verifySecurePass(token) {
    const payload = (0, pass_jwt_1.verifyPassToken)(token);
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: payload.purchaseId,
        },
        include: {
            user: true,
            event: true,
            ticket: true,
        },
    });
    if (!purchase) {
        throw new Error("Pass not found.");
    }
    if (purchase.status !== "PAID") {
        throw new Error("Ticket not paid.");
    }
    return {
        purchase,
        alreadyCheckedIn: purchase.checkedIn,
    };
}
async function checkInPass(token, organizerId) {
    const payload = (0, pass_jwt_1.verifyPassToken)(token);
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: {
            id: payload.purchaseId,
        },
        include: {
            user: true,
            event: true,
            ticket: true,
        },
    });
    if (!purchase) {
        throw new Error("Pass not found.");
    }
    if (purchase.status !== "PAID") {
        throw new Error("Ticket has not been paid.");
    }
    if (purchase.checkedIn) {
        throw new Error("Attendee has already checked in.");
    }
    const checkedPurchase = purchase;
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.ticketPurchase.update({
            where: {
                id: checkedPurchase.id,
            },
            data: {
                checkedIn: true,
                checkedInAt: new Date(),
            },
        }),
        prisma_1.prisma.ticketCheckIn.create({
            data: {
                purchaseId: checkedPurchase.id,
                checkedInBy: organizerId,
            },
        }),
    ]);
    const attendance = await prisma_1.prisma.ticketPurchase.count({
        where: {
            eventId: checkedPurchase.eventId,
            checkedIn: true,
        },
    });
    const totalTickets = await prisma_1.prisma.ticketPurchase.count({
        where: {
            eventId: checkedPurchase.eventId,
            status: "PAID",
        },
    });
    (0, realtime_1.attendanceUpdated)(checkedPurchase.eventId, {
        checkedIn: attendance,
        totalTickets,
        remaining: totalTickets -
            attendance,
        purchaseId: checkedPurchase.id,
        attendeeId: checkedPurchase.userId,
        ticketTypeId: checkedPurchase.ticketTypeId,
        staffId: organizerId,
        checkedInAt: new Date().toISOString(),
    });
    (0, realtime_1.notifyAttendee)(checkedPurchase.userId, {
        type: "CHECK_IN_SUCCESS",
        title: "Welcome!",
        message: "You have successfully checked in.",
        eventId: checkedPurchase.eventId,
        purchaseId: checkedPurchase.id,
        checkedInAt: new Date().toISOString(),
    });
    return {
        attendance,
        totalTickets,
        remaining: totalTickets -
            attendance,
        purchase: checkedPurchase,
    };
}
