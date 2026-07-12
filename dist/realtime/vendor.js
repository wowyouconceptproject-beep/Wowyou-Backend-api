"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorApplicationCreated = vendorApplicationCreated;
exports.vendorApplicationUpdated = vendorApplicationUpdated;
const socket_1 = require("./socket");
const rooms_1 = require("./rooms");
const events_1 = require("./events");
function vendorApplicationCreated(payload) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(payload.eventId))
        .emit(events_1.RealtimeEvents.VendorApplicationCreated, payload.application);
}
function vendorApplicationUpdated(payload) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(payload.eventId))
        .emit(events_1.RealtimeEvents.VendorApplicationUpdated, payload.application);
}
