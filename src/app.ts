import express from "express";
import pool from "./db.js";
import routes from "./routes.js";

const app = express();
app.use(express.json());
app.use("/api", routes);

// Health check
app.get("/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT 1");
    res.json({ status: "ok", db: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: "error", error: err });
  }
});

export default app;