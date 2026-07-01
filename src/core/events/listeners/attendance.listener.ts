import { prisma } from "../../../lib/prisma";

import { eventBus } from "../event-bus";
import { Events } from "../event.types";

import { attendanceUpdated } from "../../../realtime/attendance";

eventBus.on(
  Events.ATTENDEE_CHECKED_IN,
  async (payload) => {
    try {
      const checkedIn =
        await prisma.ticketPurchase.count({
          where: {
            eventId:
              payload.eventId,
            checkedIn: true,
          },
        });

      const totalTickets =
        await prisma.ticketPurchase.count({
          where: {
            eventId:
              payload.eventId,
            status: "PAID",
          },
        });

      attendanceUpdated(
        payload.eventId,
        {
          checkedIn,

          totalTickets,

          remaining:
            totalTickets -
            checkedIn,

          purchaseId:
            payload.purchaseId,

          attendeeId:
            payload.attendeeId,

          ticketTypeId:
            payload.ticketTypeId,

          staffId:
            payload.staffId,

          station:
            payload.station,

          checkedInAt:
            payload.checkedInAt,
        }
      );

      console.log(
        `Attendance Updated: ${checkedIn}/${totalTickets}`
      );

    } catch (error) {

      console.error(
        "Attendance Listener Error",
        error
      );

    }
  }
);