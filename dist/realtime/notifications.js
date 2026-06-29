"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyAttendee = notifyAttendee;
const socket_1 = require("./socket");
const rooms_1 = require("./rooms");
function notifyAttendee(attendeeId, payload) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.attendeeRoom)(attendeeId))
        .emit("notification", payload);
}
