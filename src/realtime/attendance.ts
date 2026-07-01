import { getIO } from "./socket";
import { eventRoom } from "./rooms";
import { RealtimeEvents } from "./events";

export interface AttendancePayload {
  checkedIn: number;
  totalTickets: number;
  remaining: number;

  purchaseId: string;
  attendeeId: string;
  ticketTypeId: string;

  staffId: string;
  station?: string | null;

  checkedInAt: string;
}

export function attendanceUpdated(
  eventId: string,
  payload: AttendancePayload
) {
  getIO()
    .to(eventRoom(eventId))
    .emit(
      RealtimeEvents.AttendanceUpdated,
      payload
    );
}