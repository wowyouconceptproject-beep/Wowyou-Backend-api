import { getIO } from "./socket";
import { eventRoom } from "./rooms";
import { RealtimeEvents } from "./events";

export interface StaffRealtimePayload {
  eventId: string;

  id: string;

  name: string;

  role: string;
}

export function staffOnline(
  payload: StaffRealtimePayload
) {
  getIO()
    .to(eventRoom(payload.eventId))
    .emit(
      RealtimeEvents.StaffOnline,
      payload
    );
}

export function staffOffline(
  payload: StaffRealtimePayload
) {
  getIO()
    .to(eventRoom(payload.eventId))
    .emit(
      RealtimeEvents.StaffOffline,
      payload
    );
}