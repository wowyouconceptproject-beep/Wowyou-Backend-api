import { getIO } from "./socket";

import {
  attendeeRoom,
} from "./rooms";

export function notifyAttendee(
  attendeeId: string,
  payload: any
) {
  getIO()
    .to(
      attendeeRoom(
        attendeeId
      )
    )
    .emit(
      "notification",
      payload
    );
}