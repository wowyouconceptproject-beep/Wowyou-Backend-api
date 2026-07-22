/*
|--------------------------------------------------------------------------
| Socket Commands
|--------------------------------------------------------------------------
*/

export const SocketEvents = {
  /*
  |--------------------------------------------------------------------------
  | Connection
  |--------------------------------------------------------------------------
  */

  JoinEvent: "join-event",
  LeaveEvent: "leave-event",

  JoinAttendee: "join-attendee",
  LeaveAttendee: "leave-attendee",

  JoinOrganizer: "join-organizer",
  LeaveOrganizer: "leave-organizer",
} as const;

export type SocketEvent =
  (typeof SocketEvents)[keyof typeof SocketEvents];