import { getIO } from "../../realtime/socket";

import { eventRoom } from "../../realtime/rooms";

import { RealtimeEvents } from "../../realtime/events";

/*
|--------------------------------------------------------------------------
| Vendor Application Created
|--------------------------------------------------------------------------
*/

export function vendorApplicationCreated(
  payload: {
    eventId: string;
    application: any;
  },
) {
  getIO()
    .to(eventRoom(payload.eventId))
    .emit(
      RealtimeEvents.VendorApplicationCreated,
      payload.application,
    );
}

/*
|--------------------------------------------------------------------------
| Vendor Application Updated
|--------------------------------------------------------------------------
*/

export function vendorApplicationUpdated(
  payload: {
    eventId: string;
    application: any;
  },
) {
  getIO()
    .to(eventRoom(payload.eventId))
    .emit(
      RealtimeEvents.VendorApplicationUpdated,
      payload.application,
    );
}