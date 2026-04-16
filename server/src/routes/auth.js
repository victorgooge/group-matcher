import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { get, run } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function buildAuthPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role = 'student' } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const trimmedName = String(name || '').trim();

    if (!trimmedName || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    if (!['student', 'leader'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be student or leader.' });
    }

    const existingUser = await get(`SELECT id FROM users WHERE email = ?`, [normalizedEmail]);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [trimmedName, normalizedEmail, passwordHash, role]
    );

    await run(
      `INSERT INTO profiles (user_id)
       VALUES (?)`,
      [result.lastID]
    );

    const user = await get(`SELECT id, name, email, role FROM users WHERE id = ?`, [result.lastID]);
    const token = jwt.sign(buildAuthPayload(user), process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { token, user }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await get(
      `SELECT id, name, email, role, password_hash
       FROM users
       WHERE email = ?`,
      [normalizedEmail]
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const authUser = buildAuthPayload(user);
    const token = jwt.sign(authUser, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

    return res.json({
      success: true,
      message: 'Login successful.',
      data: { token, user: authUser }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out.' });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await get(`SELECT id, name, email, role FROM users WHERE id = ?`, [req.user.id]);
    return res.json({ success: true, data: { user } });
  } catch (error) {
    return next(error);
  }
});

export default router;
