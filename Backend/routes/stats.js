require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// 1. SET PORT
const PORT = process.env.PORT || 8080;

// 2. MIDDLEWARE (Crucial for Android JSON)
app.use(cors());
app.use(express.json());

// 3. THE "STAY ALIVE" ROUTES
// These ensure Railway sees the server as "Healthy"
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/", (req, res) => res.status(200).json({ message: "MeshBoard Backend Live" }));

// 4. THE ANDROID API ROUTES
// We mount them exactly how your Android ApiService.kt calls them.
// This handles @POST("api/nodes/register")
app.use("/api/nodes", require("./routes/nodes"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/tokens", require("./routes/tokens"));
app.use("/api/sync", require("./routes/sync"));
app.use("/api/stats", require("./routes/stats"));

// 5. ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ error: "Something broke on the server!" });
});

// 6. START
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n✓ MESHBOARD ONLINE`);
  console.log(`  Listening on Port: ${PORT}`);
});
