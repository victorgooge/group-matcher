import express from 'express';
import { all, get, run } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

async function getSessionWithGroup(sessionId) {
  return get(
    `SELECT s.*, g.title AS group_title, g.leader_id
     FROM sessions s
     JOIN study_groups g ON g.id = s.group_id
     WHERE s.id = ?`,
    [sessionId]
  );
}

async function isGroupMember(groupId, userId) {
  const row = await get(
    `SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'active'`,
    [groupId, userId]
  );
  return Boolean(row);
}

// Mark stale scheduled sessions as missed (scheduled time has passed and session never started).
async function reconcileSessionStatuses(groupId) {
  await run(
    `UPDATE sessions
     SET status = 'missed'
     WHERE group_id = ?
       AND status = 'scheduled'
       AND datetime(scheduled_at) < datetime('now')`,
    [groupId]
  );
}

// List sessions for a group — reconciles stale statuses first.
router.get('/groups/:id/sessions', async (req, res, next) => {
  try {
    await reconcileSessionStatuses(req.params.id);

    const sessions = await all(
      `SELECT id, title, scheduled_at, duration_minutes, location, notes, status, started_at, completed_at
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

// Create a new session (leader only).
router.post('/groups/:id/sessions', requireAuth, async (req, res, next) => {
  try {
    const group = await get(`SELECT leader_id FROM study_groups WHERE id = ?`, [req.params.id]);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (Number(group.leader_id) !== Number(req.user.id) && req.user.role !== 'admin') {
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
      [req.params.id, title, scheduledAt, durationMinutes, location || null, notes || null, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Session created.',
      data: { id: result.lastID }
    });
  } catch (error) {
    return next(error);
  }
});

// Get full session details (attendance, ratings, check-in status).
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
      `SELECT a.user_id, a.status, a.checked_in_at, u.name
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
      attendance.filter((e) => e.status === 'present').map((e) => Number(e.user_id))
    );

    const isLeader = Number(session.leader_id) === Number(req.user.id);
    const canManageAttendance = isLeader || req.user.role === 'admin';
    const canRate = session.status === 'completed' && presentUserIds.has(Number(req.user.id));

    const myAttendance = attendance.find((e) => Number(e.user_id) === Number(req.user.id));
    const isMember = await isGroupMember(session.group_id, req.user.id);
    const canCheckIn = session.status === 'active' && isMember && !isLeader && myAttendance?.status !== 'present';

    const eligibleRatees = members.filter(
      (m) => presentUserIds.has(Number(m.id)) && Number(m.id) !== Number(req.user.id)
    );

    const alreadyRated = new Set(
      ratings.filter((r) => Number(r.rater_user_id) === Number(req.user.id)).map((r) => Number(r.rated_user_id))
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
          startedAt: session.started_at,
          completedAt: session.completed_at,
          isLeader,
          canManageAttendance,
          canRate,
          canCheckIn,
          isMember
        },
        members,
        attendance,
        eligibleRatees: eligibleRatees.filter((m) => !alreadyRated.has(Number(m.id))),
        ratings
      }
    });
  } catch (error) {
    return next(error);
  }
});

// Leader starts a session (scheduled -> active).
router.patch('/sessions/:id/start', requireAuth, async (req, res, next) => {
  try {
    const session = await getSessionWithGroup(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (Number(session.leader_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can start sessions.' });
    }

    if (!['scheduled', 'missed'].includes(session.status)) {
      return res.status(400).json({ success: false, message: `Cannot start a session that is ${session.status}.` });
    }

    await run(
      `UPDATE sessions SET status = 'active', started_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id]
    );

    return res.json({ success: true, message: 'Session is now active.' });
  } catch (error) {
    return next(error);
  }
});

// Leader completes a session (active -> completed). Auto-marks absent for members who never checked in.
router.patch('/sessions/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const session = await getSessionWithGroup(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (Number(session.leader_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can complete sessions.' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Only active sessions can be completed.' });
    }

    const members = await all(
      `SELECT user_id FROM group_members WHERE group_id = ? AND status = 'active'`,
      [session.group_id]
    );

    // For every member without a 'present' attendance record, insert absent.
    for (const member of members) {
      await run(
        `INSERT INTO attendance (session_id, user_id, status, marked_by_user_id)
         VALUES (?, ?, 'absent', ?)
         ON CONFLICT(session_id, user_id) DO UPDATE SET
           status = CASE WHEN status = 'present' THEN 'present' ELSE 'absent' END,
           marked_by_user_id = CASE WHEN status = 'present' THEN marked_by_user_id ELSE ? END,
           updated_at = CURRENT_TIMESTAMP`,
        [req.params.id, member.user_id, req.user.id, req.user.id]
      );
    }

    await run(
      `UPDATE sessions SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id]
    );

    return res.json({ success: true, message: 'Session completed. Absent members have been recorded.' });
  } catch (error) {
    return next(error);
  }
});

// Leader cancels a session.
router.patch('/sessions/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const session = await getSessionWithGroup(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (Number(session.leader_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can cancel sessions.' });
    }

    if (['completed', 'cancelled'].includes(session.status)) {
      return res.status(400).json({ success: false, message: `Session is already ${session.status}.` });
    }

    await run(
      `UPDATE sessions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id]
    );

    return res.json({ success: true, message: 'Session cancelled.' });
  } catch (error) {
    return next(error);
  }
});

// Leader reschedules a session: marks original as rescheduled, creates a new session record.
router.patch('/sessions/:id/reschedule', requireAuth, async (req, res, next) => {
  try {
    const session = await getSessionWithGroup(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (Number(session.leader_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can reschedule sessions.' });
    }

    if (['completed', 'cancelled', 'rescheduled'].includes(session.status)) {
      return res.status(400).json({ success: false, message: `Cannot reschedule a session that is ${session.status}.` });
    }

    const scheduledAt = String(req.body.scheduledAt || '').trim();
    const durationMinutes = req.body.durationMinutes ? Number(req.body.durationMinutes) : session.duration_minutes;
    const location = req.body.location !== undefined ? String(req.body.location).trim() : session.location;
    const notes = req.body.notes !== undefined ? String(req.body.notes).trim() : session.notes;

    if (!scheduledAt) {
      return res.status(400).json({ success: false, message: 'New scheduled time is required.' });
    }

    await run(
      `UPDATE sessions SET status = 'rescheduled', rescheduled_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id]
    );

    const result = await run(
      `INSERT INTO sessions (group_id, title, scheduled_at, duration_minutes, location, notes, created_by, status, rescheduled_from_session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
      [session.group_id, session.title, scheduledAt, durationMinutes, location || null, notes || null, req.user.id, session.id]
    );

    return res.json({
      success: true,
      message: 'Session rescheduled.',
      data: { newSessionId: result.lastID }
    });
  } catch (error) {
    return next(error);
  }
});

// Student self check-in during an active session.
router.post('/sessions/:id/check-in', requireAuth, async (req, res, next) => {
  try {
    const session = await getSessionWithGroup(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Check-in is only available while the session is active.' });
    }

    const member = await isGroupMember(session.group_id, req.user.id);
    if (!member) {
      return res.status(403).json({ success: false, message: 'Only group members can check in.' });
    }

    if (Number(session.leader_id) === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Leaders do not use the student check-in flow.' });
    }

    const existing = await get(
      `SELECT status FROM attendance WHERE session_id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (existing?.status === 'present') {
      return res.status(409).json({ success: false, message: 'You have already checked in.' });
    }

    await run(
      `INSERT INTO attendance (session_id, user_id, status, checked_in_at, updated_at)
       VALUES (?, ?, 'present', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(session_id, user_id) DO UPDATE SET
         status = 'present',
         checked_in_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [req.params.id, req.user.id]
    );

    return res.json({ success: true, message: 'Checked in successfully.' });
  } catch (error) {
    return next(error);
  }
});

// Leader manually saves/overrides attendance (for corrections on completed sessions).
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

    const validStatuses = ['present', 'absent', 'excused', 'no_show'];
    for (const entry of entries) {
      const userId = Number(entry.userId);
      const status = String(entry.status || '').trim();

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
      }

      await run(
        `INSERT INTO attendance (session_id, user_id, status, marked_by_user_id, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(session_id, user_id) DO UPDATE SET
           status = excluded.status,
           marked_by_user_id = excluded.marked_by_user_id,
           updated_at = CURRENT_TIMESTAMP`,
        [req.params.id, userId, status, req.user.id]
      );
    }

    return res.json({ success: true, message: 'Attendance updated.' });
  } catch (error) {
    return next(error);
  }
});

export default router;
