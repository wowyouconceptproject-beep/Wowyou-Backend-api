export const SocketEvents = {

  JoinEvent: "join-event",
  LeaveEvent: "leave-event",

  JoinAttendee: "join-attendee",
  LeaveAttendee: "leave-attendee",

  JoinOrganizer: "join-organizer",
  LeaveOrganizer: "leave-organizer",

  /*
  |--------------------------------------------------------------------------
  | Pass
  |--------------------------------------------------------------------------
  */

  PassIssued: "pass-issued",

  PassCheckedIn: "pass-checked-in",

  PassRevoked: "pass-revoked",

  /*
  |--------------------------------------------------------------------------
  | Capacity
  |--------------------------------------------------------------------------
  */

  CapacityUpdated: "capacity-updated",

  EventStatusChanged: "event-status-changed",

} as const;