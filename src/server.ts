import "./core/events/register-listeners";
import "dotenv/config";

import http from "http";

import app from "./app";
import routes from "./routes";

import { initializeSocket } from "./realtime/socket";

import discoveryRoutes from "./modules/discovery/discovery.routes";
import legalRoutes from "./modules/legal/legal.routes";

app.get("/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    status: "ok",
    service: "WowYou Backend API",
  });
});

app.use(routes);

app.use(
  "/discovery",
  discoveryRoutes,
);

app.use(
  "/api/legal",
  legalRoutes,
);


const PORT = Number(
  process.env.PORT || 5000
);

const server =
  http.createServer(app);

initializeSocket(server);

server.listen(PORT, () => {
  console.log(`
 WowYou Backend API Running

Environment: ${
    process.env.NODE_ENV ||
    "development"
  }

Port: ${PORT}

Frontend URL:
${process.env.FRONTEND_URL}

Health Check:
http://localhost:${PORT}/health
  `);
});