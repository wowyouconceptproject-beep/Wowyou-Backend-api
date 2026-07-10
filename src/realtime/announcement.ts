import { getIO } from "./socket";

import { eventRoom } from "./rooms";

import { RealtimeEvents } from "./events";

export interface AnnouncementPayload {
  id: string;

  eventId: string;

  title: string;

  message: string;

  type: string;

  priority: string;

  audience: string;

  isPinned: boolean;

  authorId: string;

  authorName?: string;

  createdAt: string;
}

export function announcementCreated(
  payload: AnnouncementPayload
) {
  getIO()
    .to(
      eventRoom(
        payload.eventId
      )
    )
    .emit(
      RealtimeEvents.AnnouncementCreated,
      payload
    );
}

export function announcementUpdated(
  payload: AnnouncementPayload
) {
  getIO()
    .to(
      eventRoom(
        payload.eventId
      )
    )
    .emit(
      RealtimeEvents.AnnouncementUpdated,
      payload
    );
}

export function announcementDeleted(
  eventId: string,
  id: string
) {
  getIO()
    .to(
      eventRoom(
        eventId
      )
    )
    .emit(
      RealtimeEvents.AnnouncementDeleted,
      {
        id,
      }
    );
}