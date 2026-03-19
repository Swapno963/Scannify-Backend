// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ message: 'Token required' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = payload; // attach payload to req.user
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};