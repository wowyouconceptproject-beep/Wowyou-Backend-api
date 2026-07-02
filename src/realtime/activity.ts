import { getIO } from "./socket";
import { eventRoom } from "./rooms";
import { RealtimeEvents } from "./events";

export enum ActivityType {
  CHECK_IN = "CHECK_IN",
  STAFF_LOGIN = "STAFF_LOGIN",
  STAFF_LOGOUT = "STAFF_LOGOUT",
  NOTIFICATION = "NOTIFICATION",
  VENDOR_CHECK_IN = "VENDOR_CHECK_IN",
}

export interface ActivityPayload {
  id?: string;

  eventId: string;

  type: ActivityType;

  title: string;

  description: string;

  timestamp: string;

  staffId?: string;
  staffName?: string;

  attendeeId?: string;
  attendeeName?: string;

  station?: string | null;

  metadata?: Record<string, any>;
}

export function activityCreated(
  payload: ActivityPayload
) {
  getIO()
    .to(eventRoom(payload.eventId))
    .emit(
      RealtimeEvents.ActivityCreated,
      payload
    );
}