import "dotenv/config";

import app from "./app";

import routes from "./routes";

app.use(routes);

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});