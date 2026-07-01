"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPermissions = defaultPermissions;
function defaultPermissions(role) {
    switch (role) {
        case "OWNER":
            return [
                "SCAN_QR",
                "VERIFY_PASS",
                "SEARCH_ATTENDEE",
                "VIEW_DASHBOARD",
                "VIEW_ACTIVITY",
                "SEND_NOTIFICATION",
                "SEND_ANNOUNCEMENT",
                "MANAGE_STAFF",
                "MANAGE_VENDORS",
                "VIEW_REPORTS",
                "EDIT_EVENT",
            ];
        case "OPERATIONS":
            return [
                "VIEW_DASHBOARD",
                "VIEW_ACTIVITY",
                "SEND_NOTIFICATION",
                "SEND_ANNOUNCEMENT",
                "VIEW_REPORTS",
            ];
        case "CHECK_IN":
            return [
                "SCAN_QR",
                "VERIFY_PASS",
                "SEARCH_ATTENDEE",
            ];
        case "SECURITY":
            return [
                "VERIFY_PASS",
                "SEARCH_ATTENDEE",
            ];
        case "STAGE_MANAGER":
            return [
                "VIEW_ACTIVITY",
                "SEND_NOTIFICATION",
            ];
        case "VENDOR_MANAGER":
            return [
                "MANAGE_VENDORS",
                "VIEW_DASHBOARD",
            ];
        default:
            return [];
    }
}
