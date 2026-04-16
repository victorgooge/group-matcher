import express from 'express';
import { all, get, run } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserReliability } from '../services/reliabilityService.js';

const router = express.Router();

function parseCourses(courses) {
  if (Array.isArray(courses)) {
    return courses
      .map((course) => String(course).trim())
      .filter(Boolean);
  }

  if (typeof courses === 'string') {
    return courses
      .split(',')
      .map((course) => course.trim())
      .filter(Boolean);
  }

  return [];
}

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await get(
      `SELECT id, name, email, role
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    const profile = await get(
      `SELECT major, bio, study_style, courses_json, preferred_group_size
       FROM profiles
       WHERE user_id = ?`,
      [req.user.id]
    );

    const availability = await all(
      `SELECT id, day_of_week, start_time, end_time
       FROM availability_blocks
       WHERE user_id = ?
       ORDER BY
         CASE day_of_week
           WHEN 'Monday' THEN 1
           WHEN 'Tuesday' THEN 2
           WHEN 'Wednesday' THEN 3
           WHEN 'Thursday' THEN 4
           WHEN 'Friday' THEN 5
           WHEN 'Saturday' THEN 6
           WHEN 'Sunday' THEN 7
         END,
         start_time`,
      [req.user.id]
    );

    const reliability = await getUserReliability(req.user.id);

    return res.json({
      success: true,
      data: {
        user,
        profile: {
          ...profile,
          studyStyle: profile?.study_style ?? '',
          courses: JSON.parse(profile?.courses_json ?? '[]')
        },
        availability,
        reliability
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const major = String(req.body.major || '').trim();
    const bio = String(req.body.bio || '').trim();
    const studyStyle = String(req.body.studyStyle || '').trim();
    const preferredGroupSize = req.body.preferredGroupSize ? Number(req.body.preferredGroupSize) : null;
    const courses = parseCourses(req.body.courses);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    await run(`UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [name, req.user.id]);
    await run(
      `UPDATE profiles
       SET major = ?, bio = ?, study_style = ?, courses_json = ?, preferred_group_size = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [major, bio, studyStyle, JSON.stringify(courses), preferredGroupSize, req.user.id]
    );

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/me/availability', requireAuth, async (req, res, next) => {
  try {
    const dayOfWeek = String(req.body.dayOfWeek || '').trim();
    const startTime = String(req.body.startTime || '').trim();
    const endTime = String(req.body.endTime || '').trim();

    if (!dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Day, start time, and end time are required.' });
    }

    const result = await run(
      `INSERT INTO availability_blocks (user_id, day_of_week, start_time, end_time)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, dayOfWeek, startTime, endTime]
    );

    return res.status(201).json({
      success: true,
      message: 'Availability block added.',
      data: { id: result.lastID }
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/me/availability/:availabilityId', requireAuth, async (req, res, next) => {
  try {
    const result = await run(
      `DELETE FROM availability_blocks
       WHERE id = ? AND user_id = ?`,
      [req.params.availabilityId, req.user.id]
    );

    if (!result.changes) {
      return res.status(404).json({ success: false, message: 'Availability block not found.' });
    }

    return res.json({ success: true, message: 'Availability block removed.' });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await get(
      `SELECT u.id, u.name, u.role, p.major, p.bio, p.study_style, p.courses_json
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const reliability = await getUserReliability(req.params.id);

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role
        },
        profile: {
          major: user.major,
          bio: user.bio,
          studyStyle: user.study_style,
          courses: JSON.parse(user.courses_json ?? '[]')
        },
        reliability
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
