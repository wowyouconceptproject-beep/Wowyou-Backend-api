"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const routes_1 = __importDefault(require("./routes"));
const socket_1 = require("./realtime/socket");
app_1.default.get("/health", (_req, res) => {
    return res.status(200).json({
        success: true,
        status: "ok",
        service: "WowYou Backend API",
    });
});
app_1.default.use(routes_1.default);
const PORT = Number(process.env.PORT || 5000);
const server = http_1.default.createServer(app_1.default);
(0, socket_1.initializeSocket)(server);
server.listen(PORT, () => {
    console.log(`
 WowYou Backend API Running

Environment: ${process.env.NODE_ENV ||
        "development"}

Port: ${PORT}

Frontend URL:
${process.env.FRONTEND_URL}

Health Check:
http://localhost:${PORT}/health
  `);
});
