// src/routes.ts
import { Router } from "express";
import pool from "./db.js";
import bcrypt from 'bcrypt';
import { Secret } from 'jsonwebtoken';
import { SignJWT } from 'jose'; 
import dotenv from 'dotenv';
import {authenticate} from './middleware/auth.js';
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
  const { email, password, full_name } = req.body;
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
      [email, hashedPassword, full_name]
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

// Creating Scan info
router.post('/scaning_info', async (req, res) => {
  const { user_id, value, barcode_type,timestamp,device_info } = req.body;
  if (!user_id || !value || !barcode_type || !timestamp || !device_info) return res.status(400).json({ message: 'User_id, value, barcode_type,timestamp and device_info required' });

  try {

    // insert user
    const result = await pool.query(
      'INSERT INTO scan_info (user_id, value, barcode_type,timestamp,device_info ) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, value, barcode_type,timestamp,device_info ',
      [user_id, value, barcode_type,timestamp,device_info ]
    );

    const scan_info = result.rows[0];
    res.status(201).json({ scan_info });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// get Scan info of a user
router.get('/scaning_info/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (!userId) return res.status(400).json({ message: 'User_id is  required' });

  try {

    // returning all the scan info of a user
    const result = await pool.query('SELECT * FROM scan_info WHERE user_id=$1 ORDER BY timestamp DESC', [userId]);
    
    const scan_info = result.rows;
    res.status(200).json({ scan_info });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id; // from JWT

    const query = `
      WITH scans_per_day AS (
        SELECT 
          date_trunc('day', timestamp) AS scan_date,
          COUNT(*) AS total_scans
        FROM scan_info
        WHERE user_id = $1
        GROUP BY scan_date
        ORDER BY scan_date DESC
      ),
      top_codes AS (
        SELECT 
          value,
          COUNT(*) AS scan_count
        FROM scan_info
        WHERE user_id = $1
        GROUP BY value
        ORDER BY scan_count DESC
        LIMIT 10
      )
      SELECT 
        (SELECT json_agg(scans_per_day) FROM scans_per_day) AS scans_per_day,
        (SELECT json_agg(top_codes) FROM top_codes) AS top_codes;
    `;

    const result = await pool.query(query, [userId]);

    res.status(200).json({
      scansPerDay: result.rows[0].scans_per_day || [],
      topCodes: result.rows[0].top_codes || []
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
export default router;