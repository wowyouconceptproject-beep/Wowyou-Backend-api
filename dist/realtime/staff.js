"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffOnline = staffOnline;
exports.staffOffline = staffOffline;
const socket_1 = require("./socket");
const rooms_1 = require("./rooms");
const events_1 = require("./events");
function staffOnline(payload) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(payload.eventId))
        .emit(events_1.RealtimeEvents.StaffOnline, payload);
}
function staffOffline(payload) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(payload.eventId))
        .emit(events_1.RealtimeEvents.StaffOffline, payload);
}
