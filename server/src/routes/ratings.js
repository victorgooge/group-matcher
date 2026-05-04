import express from 'express';
import { all, get, run } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserReliability } from '../services/reliabilityService.js';

const router = express.Router();

router.post('/sessions/:id/ratings', requireAuth, async (req, res, next) => {
  try {
    const ratedUserId = Number(req.body.ratedUserId);
    const score = Number(req.body.score);
    const feedbackText = String(req.body.feedbackText || '').trim();

    if (!ratedUserId || !score) {
      return res.status(400).json({ success: false, message: 'Rated user and score are required.' });
    }

    if (ratedUserId === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You cannot rate yourself.' });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({ success: false, message: 'Ratings must be between 1 and 5.' });
    }

    const session = await get(`SELECT status FROM sessions WHERE id = ?`, [req.params.id]);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    if (session.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Ratings can only be submitted for completed sessions.' });
    }

    const attendanceRows = await all(
      `SELECT user_id, status
       FROM attendance
       WHERE session_id = ? AND user_id IN (?, ?)`,
      [req.params.id, req.user.id, ratedUserId]
    );

    const raterAttendance = attendanceRows.find((row) => Number(row.user_id) === Number(req.user.id));
    const ratedAttendance = attendanceRows.find((row) => Number(row.user_id) === ratedUserId);

    if (raterAttendance?.status !== 'present' || ratedAttendance?.status !== 'present') {
      return res.status(400).json({
        success: false,
        message: 'You can only rate attendees marked present for this session.'
      });
    }

    const duplicate = await get(
      `SELECT id
       FROM ratings
       WHERE session_id = ? AND rater_user_id = ? AND rated_user_id = ?`,
      [req.params.id, req.user.id, ratedUserId]
    );

    if (duplicate) {
      return res.status(409).json({ success: false, message: 'You have already submitted a rating for this attendee.' });
    }

    const priorLowRatings = await get(
      `SELECT COUNT(*) AS low_rating_count
       FROM ratings
       WHERE rater_user_id = ? AND rated_user_id = ? AND score <= 2`,
      [req.user.id, ratedUserId]
    );

    const ratingsInLastHour = await get(
      `SELECT COUNT(*) AS recent_count
       FROM ratings
       WHERE rater_user_id = ?
         AND created_at >= datetime('now', '-1 hour')`,
      [req.user.id]
    );

    const flagged =
      score <= 2 && Number(priorLowRatings?.low_rating_count ?? 0) >= 1
        ? 1
        : Number(ratingsInLastHour?.recent_count ?? 0) >= 4
          ? 1
          : 0;

    await run(
      `INSERT INTO ratings (session_id, rater_user_id, rated_user_id, score, feedback_text, flagged)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, req.user.id, ratedUserId, score, feedbackText, flagged]
    );

    const reliability = await getUserReliability(ratedUserId);
    await run(
      `INSERT INTO reliability_snapshots (user_id, score, attendance_rate, peer_rating_avg, no_show_count)
       VALUES (?, ?, ?, ?, ?)`,
      [
        ratedUserId,
        reliability.score,
        reliability.attendanceRate,
        reliability.peerRatingAverage,
        reliability.noShowCount
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Rating submitted successfully.',
      data: { reliability }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/users/:id/ratings', async (req, res, next) => {
  try {
    const ratings = await all(
      `SELECT r.id, r.session_id, r.rater_user_id, r.score, r.feedback_text, r.flagged, r.created_at, u.name AS rater_name
       FROM ratings r
       JOIN users u ON u.id = r.rater_user_id
       WHERE r.rated_user_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    return res.json({ success: true, data: { ratings } });
  } catch (error) {
    return next(error);
  }
});

router.get('/users/:id/reliability', async (req, res, next) => {
  try {
    const reliability = await getUserReliability(req.params.id);
    return res.json({ success: true, data: { reliability } });
  } catch (error) {
    return next(error);
  }
});

export default router;
