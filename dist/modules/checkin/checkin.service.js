"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performCheckIn = performCheckIn;
const prisma_1 = require("../../lib/prisma");
const socket_1 = require("../../realtime/socket");
const rooms_1 = require("../../realtime/rooms");
const socket_events_1 = require("../../realtime/socket-events");
const pass_service_1 = require("../pass/pass.service");
/*
|--------------------------------------------------------------------------
| Check In
|--------------------------------------------------------------------------
*/
async function performCheckIn(input) {
    /*
    |--------------------------------------------------------------------------
    | Verify Pass
    |--------------------------------------------------------------------------
    */
    const verification = await (0, pass_service_1.verifySecurePass)(input.token);
    const purchase = verification.purchase;
    /*
    |--------------------------------------------------------------------------
    | Already Checked In
    |--------------------------------------------------------------------------
    */
    if (purchase.checkedIn) {
        return {
            success: true,
            alreadyCheckedIn: true,
            attendee: purchase.user,
            purchase,
            pass: purchase.passes[0],
            event: purchase.event,
            checkIn: purchase.checkIn,
        };
    }
    /*
    |--------------------------------------------------------------------------
    | Transaction
    |--------------------------------------------------------------------------
    */
    return prisma_1.prisma.$transaction(async (tx) => {
        /*
        |--------------------------------------------------------------------------
        | Purchase
        |--------------------------------------------------------------------------
        */
        await tx.ticketPurchase.update({
            where: {
                id: purchase.id,
            },
            data: {
                checkedIn: true,
                checkedInAt: new Date(),
            },
        });
        /*
        |--------------------------------------------------------------------------
        | Event Pass
        |--------------------------------------------------------------------------
        */
        if (purchase.passes.length >
            0) {
            await tx.eventPass.update({
                where: {
                    id: purchase
                        .passes[0]
                        .id,
                },
                data: {
                    ...(input.scanType ===
                        "NFC"
                        ? {
                            lastNfcReadAt: new Date(),
                        }
                        : {}),
                    lastGeneratedAt: new Date(),
                },
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Ticket Check In
        |--------------------------------------------------------------------------
        */
        const checkIn = await tx.ticketCheckIn.create({
            data: {
                purchaseId: purchase.id,
                checkedInBy: input.staffId,
                station: input.station,
                deviceId: input.deviceId,
                checkedInAt: new Date(),
            },
        });
        /*
        |--------------------------------------------------------------------------
        | Capacity
        |--------------------------------------------------------------------------
        */
        const updatedEvent = await tx.event.update({
            where: {
                id: purchase.eventId,
            },
            data: {
                currentOccupancy: {
                    increment: 1,
                },
                totalCheckIns: {
                    increment: 1,
                },
            },
            select: {
                id: true,
                capacity: true,
                currentOccupancy: true,
                totalCheckIns: true,
                totalCheckOuts: true,
            },
        });
        /*
        |--------------------------------------------------------------------------
        | Activity
        |--------------------------------------------------------------------------
        */
        await tx.eventActivity.create({
            data: {
                eventId: purchase.eventId,
                purchaseId: purchase.id,
                type: "ATTENDEE_CHECKED_IN",
                title: "Attendee Checked In",
                description: `${purchase.user.firstName} ${purchase.user.lastName} checked in.`,
                payload: {
                    scanType: input.scanType,
                    station: input.station,
                    deviceId: input.deviceId,
                },
            },
        });
        /*
        |--------------------------------------------------------------------------
        | Live Capacity Update
        |--------------------------------------------------------------------------
        */
        (0, socket_1.getIO)()
            .to((0, rooms_1.eventRoom)(purchase.eventId))
            .emit(socket_events_1.SocketEvents.CapacityUpdated, {
            eventId: updatedEvent.id,
            capacity: updatedEvent.capacity,
            currentOccupancy: updatedEvent.currentOccupancy,
            totalCheckIns: updatedEvent.totalCheckIns,
            totalCheckOuts: updatedEvent.totalCheckOuts,
            occupancyPercentage: updatedEvent.capacity ===
                0
                ? 0
                : Number(((updatedEvent.currentOccupancy /
                    updatedEvent.capacity) *
                    100).toFixed(2)),
        });
        /*
|--------------------------------------------------------------------------
| Notify Attendee
|--------------------------------------------------------------------------
*/
        (0, socket_1.getIO)()
            .to((0, rooms_1.attendeeRoom)(purchase.userId))
            .emit(socket_events_1.SocketEvents.PassCheckedIn, {
            passId: purchase.passes[0]?.id,
            purchaseId: purchase.id,
            attendeeId: purchase.userId,
            checkedIn: true,
            checkedInAt: checkIn.checkedInAt,
            checkedInBy: input.staffId,
            station: input.station,
            status: "CHECKED_IN",
        });
        return {
            success: true,
            alreadyCheckedIn: false,
            attendee: purchase.user,
            purchase,
            pass: purchase.passes[0],
            event: purchase.event,
            checkIn,
            capacity: {
                currentOccupancy: updatedEvent.currentOccupancy,
                totalCheckIns: updatedEvent.totalCheckIns,
                totalCheckOuts: updatedEvent.totalCheckOuts,
                occupancyPercentage: updatedEvent.capacity ===
                    0
                    ? 0
                    : Number(((updatedEvent.currentOccupancy /
                        updatedEvent.capacity) *
                        100).toFixed(2)),
            },
        };
    });
}
