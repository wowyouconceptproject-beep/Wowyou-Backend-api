import { eventBus } from "../event-bus";

import { Events } from "../event.types";

eventBus.on(
  Events.ATTENDEE_CHECKED_IN,
  async (payload) => {
    console.log(
      "Create Event Activity",
      payload
    );

    /**
     * TODO
     *
     * prisma.eventActivity.create(...)
     *
     */
  }
);