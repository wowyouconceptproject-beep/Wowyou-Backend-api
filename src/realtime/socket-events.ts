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

  /*
  |--------------------------------------------------------------------------
  | Capacity
  |--------------------------------------------------------------------------
  */

  CapacityUpdated: "capacity-updated",
} as const;