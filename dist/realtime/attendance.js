"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceUpdated = attendanceUpdated;
const socket_1 = require("./socket");
const rooms_1 = require("./rooms");
function attendanceUpdated(eventId, attendance) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(eventId))
        .emit("attendance.updated", {
        attendance,
    });
}
