"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorApplicationCreated = vendorApplicationCreated;
exports.vendorApplicationUpdated = vendorApplicationUpdated;
const socket_1 = require("../../realtime/socket");
const rooms_1 = require("../../realtime/rooms");
const events_1 = require("../../realtime/events");
/*
|--------------------------------------------------------------------------
| Vendor Application Created
|--------------------------------------------------------------------------
*/
function vendorApplicationCreated(payload) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(payload.eventId))
        .emit(events_1.RealtimeEvents.VendorApplicationCreated, payload.application);
}
/*
|--------------------------------------------------------------------------
| Vendor Application Updated
|--------------------------------------------------------------------------
*/
function vendorApplicationUpdated(payload) {
    (0, socket_1.getIO)()
        .to((0, rooms_1.eventRoom)(payload.eventId))
        .emit(events_1.RealtimeEvents.VendorApplicationUpdated, payload.application);
}
