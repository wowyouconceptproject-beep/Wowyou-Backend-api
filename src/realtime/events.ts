export const RealtimeEvents = {
  AttendanceUpdated:
    "attendance.updated",

  ActivityCreated:
    "activity.created",

  AnnouncementCreated:
    "announcement.created",

  AnnouncementUpdated:
    "announcement.updated",

  AnnouncementDeleted:
    "announcement.deleted",

  StaffOnline:
    "staff.online",

  StaffOffline:
    "staff.offline",

  Notification:
    "notification",

  VendorApplicationCreated:
    "vendor.application.created",

  VendorApplicationUpdated:
    "vendor.application.updated",
} as const;

export type RealtimeEvent =
  (typeof RealtimeEvents)[keyof typeof RealtimeEvents];