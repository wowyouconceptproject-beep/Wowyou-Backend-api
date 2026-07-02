"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityType = void 0;
exports.activityCreated = activityCreated;
const socket_1 = require("./socket");
const rooms_1 = require("./rooms");
const events_1 = require("./events");
var ActivityType;
(function (ActivityType) {
    ActivityType["CHECK_IN"] = "CHECK_IN";
    ActivityType["STAFF_LOGIN"] = "STAFF_LOGIN";
    ActivityType["STAFF_LOGOUT"] = "STAFF_LOGOUT";
    ActivityType["NOTIFICATION"] = "NOTIFICATION";
    ActivityType["VENDOR_CHECK_IN"] = "VENDOR_CHECK_IN";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
function activityCreated(payload) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(payload.eventId))
        .emit(events_1.RealtimeEvents.ActivityCreated, payload);
}
