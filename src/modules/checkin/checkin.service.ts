import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

import {
  getIO,
} from "../../realtime/socket";

import {
  eventRoom,
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
  | Transaction
  |--------------------------------------------------------------------------
  */

  return prisma.$transaction(
    async (tx) => {
      /*
      |--------------------------------------------------------------------------
      | Purchase
      |--------------------------------------------------------------------------
      */

      await tx.ticketPurchase.update({
        where: {
          id:
            purchase.id,
        },

        data: {
          checkedIn:
            true,

          checkedInAt:
            new Date(),
        },
      });

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
                    new Date(),
                }
              : {}),

            lastGeneratedAt:
              new Date(),
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

            checkedInAt:
              new Date(),
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
      | Live Capacity Update
      |--------------------------------------------------------------------------
      */

      getIO()
        .to(
          eventRoom(
            purchase.eventId,
          ),
        )
        .emit(
          SocketEvents.CapacityUpdated,
          {
            eventId:
              updatedEvent.id,

            capacity:
              updatedEvent.capacity,

            currentOccupancy:
              updatedEvent.currentOccupancy,

            totalCheckIns:
              updatedEvent.totalCheckIns,

            totalCheckOuts:
              updatedEvent.totalCheckOuts,

            occupancyPercentage:
              updatedEvent.capacity ===
              0
                ? 0
                : Number(
                    (
                      (updatedEvent.currentOccupancy /
                        updatedEvent.capacity) *
                      100
                    ).toFixed(
                      2,
                    ),
                  ),
          },
        );

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

          occupancyPercentage:
            updatedEvent.capacity ===
            0
              ? 0
              : Number(
                  (
                    (updatedEvent.currentOccupancy /
                      updatedEvent.capacity) *
                    100
                  ).toFixed(2),
                ),
        },
      };
    },
  );
}