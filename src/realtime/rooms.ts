export function eventRoom(
  eventId: string
) {
  return `event:${eventId}`;
}

export function organizerRoom(
  organizerId: string
) {
  return `organizer:${organizerId}`;
}

export function attendeeRoom(
  attendeeId: string
) {
  return `attendee:${attendeeId}`;
}
