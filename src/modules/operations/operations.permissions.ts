export const Permissions = {
  SCAN_QR: "SCAN_QR",

  VERIFY_PASS: "VERIFY_PASS",

  SEARCH_ATTENDEE: "SEARCH_ATTENDEE",

  MANUAL_CHECK_IN: "MANUAL_CHECK_IN",

  VIEW_ACTIVITY: "VIEW_ACTIVITY",

  SEND_ANNOUNCEMENT: "SEND_ANNOUNCEMENT",

  VIEW_DASHBOARD: "VIEW_DASHBOARD",
} as const;

export type Permission =
  (typeof Permissions)[keyof typeof Permissions];