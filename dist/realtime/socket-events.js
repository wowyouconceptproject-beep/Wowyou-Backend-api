"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEvents = void 0;
exports.SocketEvents = {
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
};
