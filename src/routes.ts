// src/routes.ts
import { Router } from "express";
import pool from "./db.js";

const router = Router();

router.get("/users", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users LIMIT 10");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

export default router;