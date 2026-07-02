"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceUpdated = attendanceUpdated;
const socket_1 = require("./socket");
const rooms_1 = require("./rooms");
const events_1 = require("./events");
function attendanceUpdated(payload) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(payload.eventId))
        .emit(events_1.RealtimeEvents.AttendanceUpdated, payload);
    return payload;
}
