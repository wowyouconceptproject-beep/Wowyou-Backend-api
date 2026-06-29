import { Server } from "socket.io";

let io: Server;

export function initializeSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log(
      "Socket Connected:",
      socket.id
    );

    socket.on(
      "join-event",
      (eventId: string) => {
        socket.join(eventId);
      }
    );

    socket.on(
      "leave-event",
      (eventId: string) => {
        socket.leave(eventId);
      }
    );

    socket.on(
      "disconnect",
      () => {
        console.log(
          "Socket Disconnected:",
          socket.id
        );
      }
    );
  });
}

export function getIO() {
  return io;
}