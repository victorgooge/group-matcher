import express from 'express';
import { all, get, run } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

async function getGroupLeaderId(groupId) {
  const group = await get(`SELECT leader_id FROM study_groups WHERE id = ?`, [groupId]);
  return group?.leader_id ?? null;
}

async function getSessionWithGroup(sessionId) {
  return get(
    `SELECT s.*, g.title AS group_title, g.leader_id
     FROM sessions s
     JOIN study_groups g ON g.id = s.group_id
     WHERE s.id = ?`,
    [sessionId]
  );
}

router.get('/groups/:id/sessions', async (req, res, next) => {
  try {
    const sessions = await all(
      `SELECT id, title, scheduled_at, duration_minutes, location, notes, status
       FROM sessions
       WHERE group_id = ?
       ORDER BY scheduled_at DESC`,
      [req.params.id]
    );

    return res.json({ success: true, data: { sessions } });
  } catch (error) {
    return next(error);
  }
});

router.post('/groups/:id/sessions', requireAuth, async (req, res, next) => {
  try {
    const leaderId = await getGroupLeaderId(req.params.id);
    if (!leaderId) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (Number(leaderId) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can create sessions.' });
    }

    const title = String(req.body.title || '').trim();
    const scheduledAt = String(req.body.scheduledAt || '').trim();
    const durationMinutes = Number(req.body.durationMinutes);
    const location = String(req.body.location || '').trim();
    const notes = String(req.body.notes || '').trim();

    if (!title || !scheduledAt || !durationMinutes) {
      return res.status(400).json({ success: false, message: 'Title, scheduled time, and duration are required.' });
    }

    const result = await run(
      `INSERT INTO sessions (group_id, title, scheduled_at, duration_minutes, location, notes, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [req.params.id, title, scheduledAt, durationMinutes, location, notes, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Session created successfully.',
      data: { id: result.lastID }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/sessions/:id', requireAuth, async (req, res, next) => {
  try {
    const session = await getSessionWithGroup(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const members = await all(
      `SELECT u.id, u.name
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ? AND gm.status = 'active'
       ORDER BY u.name`,
      [session.group_id]
    );

    const attendance = await all(
      `SELECT a.user_id, a.status, u.name
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE a.session_id = ?
       ORDER BY u.name`,
      [req.params.id]
    );

    const ratings = await all(
      `SELECT r.id, r.rater_user_id, r.rated_user_id, r.score, r.feedback_text, r.flagged, r.created_at,
              rater.name AS rater_name, rated.name AS rated_name
       FROM ratings r
       JOIN users rater ON rater.id = r.rater_user_id
       JOIN users rated ON rated.id = r.rated_user_id
       WHERE r.session_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    const presentUserIds = new Set(
      attendance.filter((entry) => entry.status === 'present').map((entry) => Number(entry.user_id))
    );

    const canManageAttendance =
      Number(session.leader_id) === Number(req.user.id) || req.user.role === 'admin';
    const canRate = presentUserIds.has(Number(req.user.id));

    const eligibleRatees = members.filter(
      (member) => presentUserIds.has(Number(member.id)) && Number(member.id) !== Number(req.user.id)
    );

    return res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          groupId: session.group_id,
          groupTitle: session.group_title,
          title: session.title,
          scheduledAt: session.scheduled_at,
          durationMinutes: session.duration_minutes,
          location: session.location,
          notes: session.notes,
          status: session.status,
          canManageAttendance,
          canRate
        },
        members,
        attendance,
        eligibleRatees,
        ratings
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/sessions/:id/attendance', requireAuth, async (req, res, next) => {
  try {
    const session = await getSessionWithGroup(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (Number(session.leader_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can mark attendance.' });
    }

    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    if (!entries.length) {
      return res.status(400).json({ success: false, message: 'Attendance entries are required.' });
    }

    for (const entry of entries) {
      const userId = Number(entry.userId);
      const status = String(entry.status || '').trim();

      if (!['present', 'absent', 'excused', 'no_show'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Attendance status is invalid.' });
      }

      await run(
        `INSERT INTO attendance (session_id, user_id, status, marked_by_user_id, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(session_id, user_id)
         DO UPDATE SET status = excluded.status, marked_by_user_id = excluded.marked_by_user_id, updated_at = CURRENT_TIMESTAMP`,
        [req.params.id, userId, status, req.user.id]
      );
    }

    await run(`UPDATE sessions SET status = 'completed' WHERE id = ?`, [req.params.id]);

    return res.json({ success: true, message: 'Attendance saved successfully.' });
  } catch (error) {
    return next(error);
  }
});

export default router;
