import { prisma } from "../../lib/prisma";

import {
  getIO,
} from "../../realtime/socket";

import {
  eventRoom,
  attendeeRoom,
} from "../../realtime/rooms";

import {
  SocketEvents,
} from "../../realtime/socket-events";

import {
  verifySecurePass,
} from "../pass/pass.service";

import {
  CheckInInput,
} from "./checkin.type";

/*
|--------------------------------------------------------------------------
| Check In
|--------------------------------------------------------------------------
*/

export async function performCheckIn(
  input: CheckInInput,
) {
  /*
  |--------------------------------------------------------------------------
  | Verify Pass
  |--------------------------------------------------------------------------
  */

  const verification =
    await verifySecurePass(
      input.token,
    );

  const purchase =
    verification.purchase;

  /*
  |--------------------------------------------------------------------------
  | Already Checked In
  |--------------------------------------------------------------------------
  */

  if (
    purchase.checkedIn
  ) {
    return {
      success: true,

      alreadyCheckedIn:
        true,

      attendee:
        purchase.user,

      purchase,

      pass:
        purchase.passes[0],

      event:
        purchase.event,

      checkIn:
        purchase.checkIn,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Check In Timestamp
  |--------------------------------------------------------------------------
  */

  const checkedInAt =
    new Date();

  /*
  |--------------------------------------------------------------------------
  | Transaction
  |--------------------------------------------------------------------------
  */

  const result =
    await prisma.$transaction(
      async (tx) => {
        /*
        |--------------------------------------------------------------------------
        | Atomic Check-In
        |--------------------------------------------------------------------------
        |
        | Only one scanner can change this purchase from
        | checkedIn = false to checkedIn = true.
        |
        */

        const updatedPurchase =
          await tx.ticketPurchase.updateMany({
            where: {
              id:
                purchase.id,

              checkedIn:
                false,
            },

            data: {
              checkedIn:
                true,

              checkedInAt,
            },
          });

        /*
        |--------------------------------------------------------------------------
        | Duplicate Scan
        |--------------------------------------------------------------------------
        */

        if (
          updatedPurchase.count !==
          1
        ) {
          const existingPurchase =
            await tx.ticketPurchase.findUnique({
              where: {
                id:
                  purchase.id,
              },

              include: {
                user: true,

                event: true,

                passes: true,

                checkIn: true,
              },
            });

          return {
            success: true,

            alreadyCheckedIn:
              true,

            attendee:
              existingPurchase?.user,

            purchase:
              existingPurchase,

            pass:
              existingPurchase
                ?.passes[0],

            event:
              existingPurchase?.event,

            checkIn:
              existingPurchase?.checkIn,
          };
        }

        /*
        |--------------------------------------------------------------------------
        | Event Pass
        |--------------------------------------------------------------------------
        */

        if (
          purchase.passes.length >
          0
        ) {
          await tx.eventPass.update({
            where: {
              id:
                purchase
                  .passes[0]
                  .id,
            },

            data: {
              ...(input.scanType ===
              "NFC"
                ? {
                    lastNfcReadAt:
                      checkedInAt,
                  }
                : {}),

              lastGeneratedAt:
                checkedInAt,
            },
          });
        }

        /*
        |--------------------------------------------------------------------------
        | Ticket Check In
        |--------------------------------------------------------------------------
        */

        const checkIn =
          await tx.ticketCheckIn.create({
            data: {
              purchaseId:
                purchase.id,

              checkedInBy:
                input.staffId,

              station:
                input.station,

              deviceId:
                input.deviceId,

              checkedInAt,
            },
          });

        /*
        |--------------------------------------------------------------------------
        | Capacity
        |--------------------------------------------------------------------------
        */

        const updatedEvent =
          await tx.event.update({
            where: {
              id:
                purchase.eventId,
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

              currentOccupancy:
                true,

              totalCheckIns:
                true,

              totalCheckOuts:
                true,
            },
          });

        /*
        |--------------------------------------------------------------------------
        | Occupancy Percentage
        |--------------------------------------------------------------------------
        */

        const occupancyPercentage =
          updatedEvent.capacity ===
          0
            ? 0
            : Number(
                (
                  (updatedEvent.currentOccupancy /
                    updatedEvent.capacity) *
                  100
                ).toFixed(2),
              );

        /*
        |--------------------------------------------------------------------------
        | Activity
        |--------------------------------------------------------------------------
        */

        await tx.eventActivity.create({
          data: {
            eventId:
              purchase.eventId,

            purchaseId:
              purchase.id,

            type:
              "ATTENDEE_CHECKED_IN",

            title:
              "Attendee Checked In",

            description:
              `${purchase.user.firstName} ${purchase.user.lastName} checked in.`,

            payload: {
              scanType:
                input.scanType,

              station:
                input.station,

              deviceId:
                input.deviceId,
            },
          },
        });

        /*
        |--------------------------------------------------------------------------
        | Transaction Result
        |--------------------------------------------------------------------------
        */

        return {
          success: true,

          alreadyCheckedIn:
            false,

          attendee:
            purchase.user,

          purchase,

          pass:
            purchase.passes[0],

          event:
            purchase.event,

          checkIn,

          capacity: {
            currentOccupancy:
              updatedEvent.currentOccupancy,

            totalCheckIns:
              updatedEvent.totalCheckIns,

            totalCheckOuts:
              updatedEvent.totalCheckOuts,

            occupancyPercentage,
          },
        };
      },
    );

  /*
  |--------------------------------------------------------------------------
  | Duplicate Scan
  |--------------------------------------------------------------------------
  |
  | Another scanner already completed the check-in.
  | Do not emit another realtime check-in event.
  |
  */

  if (
    result.alreadyCheckedIn ||
    !result.capacity
  ) {
    return result;
  }

  /*
  |--------------------------------------------------------------------------
  | Realtime Data
  |--------------------------------------------------------------------------
  |
  | At this point the transaction has successfully committed.
  |
  */

  const io =
    getIO();

  /*
  |--------------------------------------------------------------------------
  | Live Capacity Update
  |--------------------------------------------------------------------------
  */

  io
    .to(
      eventRoom(
        result.event.id,
      ),
    )
    .emit(
      SocketEvents.CapacityUpdated,
      {
        eventId:
          result.event.id,

        capacity:
          result.event.capacity,

        currentOccupancy:
          result.capacity
            .currentOccupancy,

        totalCheckIns:
          result.capacity
            .totalCheckIns,

        totalCheckOuts:
          result.capacity
            .totalCheckOuts,

        occupancyPercentage:
          result.capacity
            .occupancyPercentage,
      },
    );

  /*
  |--------------------------------------------------------------------------
  | Notify Attendee
  |--------------------------------------------------------------------------
  */

  io
    .to(
      attendeeRoom(
        result.purchase.userId,
      ),
    )
    .emit(
      SocketEvents.PassCheckedIn,
      {
        passId:
          result.pass?.id,

        purchaseId:
          result.purchase.id,

        attendeeId:
          result.purchase.userId,

        checkedIn:
          true,

        checkedInAt:
          result.checkIn.checkedInAt,

        checkedInBy:
          input.staffId,

        station:
          input.station,

        status:
          "CHECKED_IN",
      },
    );

  /*
  |--------------------------------------------------------------------------
  | Final Response
  |--------------------------------------------------------------------------
  */

  return {
    success:
      result.success,

    alreadyCheckedIn:
      result.alreadyCheckedIn,

    attendee:
      result.attendee,

    purchase:
      result.purchase,

    pass:
      result.pass,

    event:
      result.event,

    checkIn:
      result.checkIn,

    capacity:
      result.capacity,
  };
}