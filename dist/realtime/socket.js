"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = initializeSocket;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
const rooms_1 = require("./rooms");
const socket_events_1 = require("./socket-events");
const socket_auth_1 = require("../middleware/socket-auth");
let io;
function initializeSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
        },
    });
    io.on("connection", (socket) => {
        console.log("Socket Connected:", socket.id);
        /*
        |--------------------------------------------------------------------------
        | Join Event
        |--------------------------------------------------------------------------
        */
        socket.on(socket_events_1.SocketEvents.JoinEvent, ({ eventId, token, }) => {
            const user = (0, socket_auth_1.verifySocketToken)(token);
            if (!user) {
                socket.emit("socket.error", {
                    message: "Unauthorized",
                });
                return;
            }
            socket.user = user;
            socket.join((0, rooms_1.eventRoom)(eventId));
            console.log(`${user.userId} joined ${(0, rooms_1.eventRoom)(eventId)}`);
        });
        /*
        |--------------------------------------------------------------------------
        | Leave Event
        |--------------------------------------------------------------------------
        */
        socket.on(socket_events_1.SocketEvents.LeaveEvent, (eventId) => {
            if (!eventId)
                return;
            socket.leave((0, rooms_1.eventRoom)(eventId));
            console.log(`${socket.id} left ${(0, rooms_1.eventRoom)(eventId)}`);
        });
        /*
        |--------------------------------------------------------------------------
        | Join Attendee
        |--------------------------------------------------------------------------
        */
        socket.on(socket_events_1.SocketEvents.JoinAttendee, ({ attendeeId, token, }) => {
            const user = (0, socket_auth_1.verifySocketToken)(token);
            if (!user ||
                !attendeeId) {
                socket.emit("socket.error", {
                    message: "Unauthorized",
                });
                return;
            }
            socket.user = user;
            socket.join((0, rooms_1.attendeeRoom)(attendeeId));
            console.log(`${user.userId} joined ${(0, rooms_1.attendeeRoom)(attendeeId)}`);
        });
        /*
        |--------------------------------------------------------------------------
        | Leave Attendee
        |--------------------------------------------------------------------------
        */
        socket.on(socket_events_1.SocketEvents.LeaveAttendee, (attendeeId) => {
            if (!attendeeId)
                return;
            socket.leave((0, rooms_1.attendeeRoom)(attendeeId));
            console.log(`${socket.id} left ${(0, rooms_1.attendeeRoom)(attendeeId)}`);
        });
        /*
        |--------------------------------------------------------------------------
        | Join Organizer
        |--------------------------------------------------------------------------
        */
        socket.on(socket_events_1.SocketEvents.JoinOrganizer, ({ organizerId, token, }) => {
            const user = (0, socket_auth_1.verifySocketToken)(token);
            if (!user ||
                !organizerId) {
                socket.emit("socket.error", {
                    message: "Unauthorized",
                });
                return;
            }
            socket.user = user;
            socket.join((0, rooms_1.organizerRoom)(organizerId));
            console.log(`${user.userId} joined ${(0, rooms_1.organizerRoom)(organizerId)}`);
        });
        /*
        |--------------------------------------------------------------------------
        | Leave Organizer
        |--------------------------------------------------------------------------
        */
        socket.on(socket_events_1.SocketEvents.LeaveOrganizer, (organizerId) => {
            if (!organizerId)
                return;
            socket.leave((0, rooms_1.organizerRoom)(organizerId));
            console.log(`${socket.id} left ${(0, rooms_1.organizerRoom)(organizerId)}`);
        });
        /*
        |--------------------------------------------------------------------------
        | Disconnect
        |--------------------------------------------------------------------------
        */
        socket.on("disconnect", () => {
            console.log("Socket Disconnected:", socket.id);
        });
    });
}
function getIO() {
    if (!io) {
        throw new Error("Socket.IO has not been initialized.");
    }
    return io;
}
