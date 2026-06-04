require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const scheduler  = require("./services/scheduler");

const app  = express();
const PORT = process.env.PORT || 8080;

// Health checks — above everything
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/",       (req, res) => res.status(200).json({ status: "MeshBoard Super-Node Live" }));

// Middleware
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Routes — all under /api
app.use("/api/nodes",    require("./routes/nodes"));
app.use("/api/posts",    require("./routes/posts"));
app.use("/api/tokens",   require("./routes/tokens"));
app.use("/api/sync",     require("./routes/sync"));
app.use("/api/stats",    require("./routes/stats"));
app.use("/api/payments", require("./routes/payments"));

// 404
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ error: "Route not found", path: req.path });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n✓ Server is live on port ${PORT}`);
  scheduler.start();
});
