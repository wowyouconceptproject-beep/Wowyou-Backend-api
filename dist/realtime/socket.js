"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = initializeSocket;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
let io;
function initializeSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
        },
    });
    io.on("connection", (socket) => {
        console.log("Socket Connected:", socket.id);
        socket.on("join-event", (eventId) => {
            socket.join(eventId);
        });
        socket.on("leave-event", (eventId) => {
            socket.leave(eventId);
        });
        socket.on("disconnect", () => {
            console.log("Socket Disconnected:", socket.id);
        });
    });
}
function getIO() {
    return io;
}
