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

          if (
            !user ||
            !eventId
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
            eventRoom(eventId)
          );

          console.log(
            `${user.userId} joined ${eventRoom(
              eventId
            )}`
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
          if (!eventId)
            return;

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
      | Uses authenticated JWT identity.
      | Client no longer sends attendeeId.
      |--------------------------------------------------------------------------
      */

      socket.on(
        SocketEvents.JoinAttendee,
        ({
          token,
        }: {
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
            attendeeRoom(
              user.userId
            )
          );

          console.log(
            `${user.userId} joined ${attendeeRoom(
              user.userId
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
        () => {
          if (!socket.user)
            return;

          socket.leave(
            attendeeRoom(
              socket.user.userId
            )
          );

          console.log(
            `${socket.user.userId} left ${attendeeRoom(
              socket.user.userId
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