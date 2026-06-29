import { getIO } from "./socket";

import { eventRoom } from "./rooms";

export function attendanceUpdated(
  eventId: string,
  attendance: number
) {
  getIO()
    .to(eventRoom(eventId))
    .emit(
      "attendance.updated",
      {
        attendance,
      }
    );
}