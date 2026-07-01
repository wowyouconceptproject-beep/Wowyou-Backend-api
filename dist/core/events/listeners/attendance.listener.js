"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../../../lib/prisma");
const event_bus_1 = require("../event-bus");
const event_types_1 = require("../event.types");
const attendance_1 = require("../../../realtime/attendance");
event_bus_1.eventBus.on(event_types_1.Events.ATTENDEE_CHECKED_IN, async (payload) => {
    try {
        const checkedIn = await prisma_1.prisma.ticketPurchase.count({
            where: {
                eventId: payload.eventId,
                checkedIn: true,
            },
        });
        const totalTickets = await prisma_1.prisma.ticketPurchase.count({
            where: {
                eventId: payload.eventId,
                status: "PAID",
            },
        });
        (0, attendance_1.attendanceUpdated)(payload.eventId, {
            checkedIn,
            totalTickets,
            remaining: totalTickets -
                checkedIn,
            purchaseId: payload.purchaseId,
            attendeeId: payload.attendeeId,
            ticketTypeId: payload.ticketTypeId,
            staffId: payload.staffId,
            station: payload.station,
            checkedInAt: payload.checkedInAt,
        });
        console.log(`Attendance Updated: ${checkedIn}/${totalTickets}`);
    }
    catch (error) {
        console.error("Attendance Listener Error", error);
    }
});
