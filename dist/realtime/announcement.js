"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcementCreated = announcementCreated;
exports.announcementUpdated = announcementUpdated;
exports.announcementDeleted = announcementDeleted;
const socket_1 = require("./socket");
const rooms_1 = require("./rooms");
const events_1 = require("./events");
function announcementCreated(payload) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(payload.eventId))
        .emit(events_1.RealtimeEvents.AnnouncementCreated, payload);
}
function announcementUpdated(payload) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(payload.eventId))
        .emit(events_1.RealtimeEvents.AnnouncementUpdated, payload);
}
function announcementDeleted(eventId, id) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(eventId))
        .emit(events_1.RealtimeEvents.AnnouncementDeleted, {
        id,
    });
}
