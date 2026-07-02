import { getIO } from "./socket";
import { eventRoom } from "./rooms";
import { RealtimeEvents } from "./events";

export interface AttendancePayload {
  eventId: string;

  checkedIn: number;
  totalTickets: number;
  remaining: number;

  purchaseId: string;

  attendeeId: string;
  attendeeName?: string;

  ticketTypeId: string;
  ticketTypeName?: string;

  staffId: string;
  staffName?: string;

  station?: string | null;

  checkedInAt: string;
}

export function attendanceUpdated(
  payload: AttendancePayload
) {
  getIO()
    .to(eventRoom(payload.eventId))
    .emit(
      RealtimeEvents.AttendanceUpdated,
      payload
    );

  return payload;
}