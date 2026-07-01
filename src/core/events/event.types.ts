export const Events = {
  ATTENDEE_CHECKED_IN:
    "attendee.checked_in",

  ATTENDEE_UNCHECKED:
    "attendee.unchecked",

  ATTENDEE_REGISTERED:
    "attendee.registered",

  STAFF_LOGIN:
    "staff.login",

  STAFF_LOGOUT:
    "staff.logout",

  ANNOUNCEMENT_CREATED:
    "announcement.created",

  EVENT_PUBLISHED:
    "event.published",
} as const;

export type EventType =
  (typeof Events)[keyof typeof Events];