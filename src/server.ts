import "dotenv/config";

import app from "./app";
import routes from "./routes";

app.get("/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    status: "ok",
    service: "WowYou Backend API",
  });
});

app.use(routes);

const PORT = Number(
  process.env.PORT || 5000
);

app.listen(PORT, () => {
  console.log(`
🚀 WowYou Backend API Running

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