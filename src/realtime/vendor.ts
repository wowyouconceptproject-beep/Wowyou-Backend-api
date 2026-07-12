import { getIO } from "./socket";
import { eventRoom } from "./rooms";
import { RealtimeEvents } from "./events";

export function vendorApplicationCreated(
  payload: {
    eventId: string;
    application: any;
  },
) {
  getIO()
    .to(
      eventRoom(payload.eventId),
    )
    .emit(
      RealtimeEvents.VendorApplicationCreated,
      payload.application,
    );
}

export function vendorApplicationUpdated(
  payload: {
    eventId: string;
    application: any;
  },
) {
  getIO()
    .to(
      eventRoom(payload.eventId),
    )
    .emit(
      RealtimeEvents.VendorApplicationUpdated,
      payload.application,
    );
}