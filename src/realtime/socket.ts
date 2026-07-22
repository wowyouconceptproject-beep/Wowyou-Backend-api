import { Server, Socket } from "socket.io";

import {
  eventRoom,
  attendeeRoom,
  organizerRoom,
} from "./rooms";

import {
  SocketEvents,
} from "./socket-events";

import {
  verifySocketToken,
  SocketUser,
} from "../middleware/socket-auth";

let io: Server;

export function initializeSocket(
  server: any
) {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on(
    "connection",
    (socket: Socket) => {
      console.log(
        "Socket Connected:",
        socket.id
      );

      /*
      |--------------------------------------------------------------------------
      | Join Event
      |--------------------------------------------------------------------------
      */

      socket.on(
  SocketEvents.JoinEvent,
  ({
    eventId,
    token,
  }: {
    eventId: string;
    token: string;
  }) => {
    const user =
      verifySocketToken(
        token
      );

    if (!user) {
      socket.emit(
        "socket.error",
        {
          message:
            "Unauthorized",
        }
      );

      return;
    }

    socket.user = user;

    socket.join(
      eventRoom(eventId)
    );

    console.log(
      `${user.userId} joined ${eventRoom(eventId)}`
    );
  }
);

      /*
      |--------------------------------------------------------------------------
      | Leave Event
      |--------------------------------------------------------------------------
      */

      socket.on(
        SocketEvents.LeaveEvent,
        (eventId: string) => {
          if (!eventId) return;

          socket.leave(
            eventRoom(eventId)
          );

          console.log(
            `${socket.id} left ${eventRoom(
              eventId
            )}`
          );
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Join Attendee
      |--------------------------------------------------------------------------
      */

      socket.on(
        SocketEvents.JoinAttendee,
        ({
          attendeeId,
          token,
        }: {
          attendeeId: string;
          token: string;
        }) => {
          const user =
            verifySocketToken(
              token
            );

          if (
            !user ||
            !attendeeId
          ) {
            socket.emit(
              "socket.error",
              {
                message:
                  "Unauthorized",
              }
            );

            return;
          }

          socket.user = user;

          socket.join(
            attendeeRoom(
              attendeeId
            )
          );

          console.log(
            `${user.userId} joined ${attendeeRoom(
              attendeeId
            )}`
          );
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Leave Attendee
      |--------------------------------------------------------------------------
      */

      socket.on(
        SocketEvents.LeaveAttendee,
        (
          attendeeId: string
        ) => {
          if (!attendeeId)
            return;

          socket.leave(
            attendeeRoom(
              attendeeId
            )
          );

          console.log(
            `${socket.id} left ${attendeeRoom(
              attendeeId
            )}`
          );
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Join Organizer
      |--------------------------------------------------------------------------
      */

      socket.on(
        SocketEvents.JoinOrganizer,
        ({
          organizerId,
          token,
        }: {
          organizerId: string;
          token: string;
        }) => {
          const user =
            verifySocketToken(
              token
            );

          if (
            !user ||
            !organizerId
          ) {
            socket.emit(
              "socket.error",
              {
                message:
                  "Unauthorized",
              }
            );

            return;
          }

          socket.user = user;

          socket.join(
            organizerRoom(
              organizerId
            )
          );

          console.log(
            `${user.userId} joined ${organizerRoom(
              organizerId
            )}`
          );
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Leave Organizer
      |--------------------------------------------------------------------------
      */

      socket.on(
        SocketEvents.LeaveOrganizer,
        (
          organizerId: string
        ) => {
          if (!organizerId)
            return;

          socket.leave(
            organizerRoom(
              organizerId
            )
          );

          console.log(
            `${socket.id} left ${organizerRoom(
              organizerId
            )}`
          );
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Disconnect
      |--------------------------------------------------------------------------
      */

      socket.on(
        "disconnect",
        () => {
          console.log(
            "Socket Disconnected:",
            socket.id
          );
        }
      );
    }
  );
}

export function getIO() {
  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized."
    );
  }

  return io;
}