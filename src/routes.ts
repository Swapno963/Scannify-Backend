// src/routes.ts
import { Router } from "express";
import pool from "./db.js";
import bcrypt from 'bcrypt';
import { Secret } from 'jsonwebtoken';
import { SignJWT } from 'jose'; // <-- v9+ uses 'jose' style
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET is not defined in .env');
}

router.get("/users", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users LIMIT 10");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});



// Registration
router.post('/register', async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  try {
    // check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Email already registered' });

    // hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // insert user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
      [email, hashedPassword, fullName]
    );

    const user = result.rows[0];
    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET missing in .env');

    // SignJWT (v9+ safe)
    const token = await new SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setExpirationTime(process.env.JWT_EXPIRES_IN || '1d')
      .sign(new TextEncoder().encode(secret));

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
export default router;