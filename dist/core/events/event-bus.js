"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
const events_1 = require("events");
class WowYouEventBus extends events_1.EventEmitter {
}
exports.eventBus = new WowYouEventBus();
