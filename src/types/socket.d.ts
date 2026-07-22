import "socket.io";
import type { SocketUser } from "../middleware/socket-auth";

declare module "socket.io" {
  interface Socket {
    user?: SocketUser;
  }
}