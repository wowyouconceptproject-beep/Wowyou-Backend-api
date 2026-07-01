"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_bus_1 = require("../event-bus");
const event_types_1 = require("../event.types");
event_bus_1.eventBus.on(event_types_1.Events.ATTENDEE_CHECKED_IN, async (payload) => {
    console.log("Create Event Activity", payload);
    /**
     * TODO
     *
     * prisma.eventActivity.create(...)
     *
     */
});
