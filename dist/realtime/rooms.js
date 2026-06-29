"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRoom = eventRoom;
exports.organizerRoom = organizerRoom;
exports.attendeeRoom = attendeeRoom;
function eventRoom(eventId) {
    return `event:${eventId}`;
}
function organizerRoom(organizerId) {
    return `organizer:${organizerId}`;
}
function attendeeRoom(attendeeId) {
    return `attendee:${attendeeId}`;
}
