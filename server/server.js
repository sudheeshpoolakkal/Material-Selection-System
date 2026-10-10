const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production")
    throw new Error("JWT_SECRET must be configured for production.");
  process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
  console.warn(
    "Using an ephemeral development session secret. Set JWT_SECRET to keep sessions across restarts.",
  );
}
const db = require("./config/db");
const catalog = require("./services/catalog");
const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const raw = (process.env.CLIENT_ORIGIN || "").trim();
      if (!raw || raw === "*" || raw === "true" || raw === "1") {
        return callback(null, origin);
      }
      const allowed = raw.split(",").map((s) => s.trim().replace(/\/+$/, ""));
      const clean = origin.replace(/\/+$/, "");
      if (allowed.includes(clean) || allowed.includes("*")) {
        return callback(null, origin);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS.`));
    },
    credentials: true,
  }),
);
app.use((req, res, next) => {
  const original = req.headers["x-matched-path"] || req.headers["x-forwarded-url"] || req.headers["x-invoke-path"];
  if ((req.url === "/server.js" || req.url === "/api/index.js") && original) {
    req.url = original;
  }
  next();
});
app.use(express.json({ limit: "64kb" }));
const authRoutes = require("./routes/authRoutes");
const selectionRoutes = require("./routes/selectionRoutes");
const projectRoutes = require("./routes/projectRoutes");
const materialRoutes = require("./routes/materialRoutes");

app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);
app.use("/api/projects/:id/selection", selectionRoutes);
app.use("/projects/:id/selection", selectionRoutes);
app.use("/api/projects", projectRoutes);
app.use("/projects", projectRoutes);
app.use("/api/materials", materialRoutes);
app.use("/materials", materialRoutes);

const healthHandler = async (req, res) => {
  try {
    await catalog.ready;
    res.json({ status: "ready", database: db.driver(), catalog: await catalog.getSummary() });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
};
app.get("/api/health", healthHandler);
app.get("/health", healthHandler);
app.use("/api", (req, res) =>
  res.status(404).json({ message: "API endpoint not found." }),
);
const build = path.join(__dirname, "../client/build");
if (fs.existsSync(path.join(build, "index.html"))) {
  app.use(express.static(build));
  app.use((req, res) => res.sendFile(path.join(build, "index.html")));
} else
  app.get("/", (req, res) =>
    res.send(
      "Starbase API. Run npm run dev from the project root to open the workspace.",
    ),
  );
app.use((err, req, res, next) =>
  res
    .status(err.status || 500)
    .json({
      message:
        err.status === 400
          ? "Invalid JSON request."
          : "An unexpected error occurred.",
    }),
);
if (require.main === module)
  catalog.ready
    .then(() =>
      app.listen(
        Number(process.env.PORT || 5000),
        process.env.STARBASE_HOST || process.env.MATERIA_HOST || "127.0.0.1",
        () =>
          console.log(
            `Starbase running at http://localhost:${process.env.PORT || 5000}`,
          ),
      ),
    )
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
module.exports = app;
