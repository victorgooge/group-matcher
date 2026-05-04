import express from 'express';
import { all, get, run } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all pending invitations for the current user.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const invitations = await all(
      `SELECT
         gi.id,
         gi.status,
         gi.created_at,
         gi.updated_at,
         g.id AS group_id,
         g.title AS group_title,
         g.course_code,
         g.meeting_format,
         u.id AS inviter_id,
         u.name AS inviter_name
       FROM group_invitations gi
       JOIN study_groups g ON g.id = gi.group_id
       JOIN users u ON u.id = gi.inviter_user_id
       WHERE gi.invited_user_id = ? AND gi.status = 'pending'
       ORDER BY gi.created_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, data: { invitations } });
  } catch (error) {
    return next(error);
  }
});

// Student accepts or declines an invitation.
router.patch('/:id/respond', requireAuth, async (req, res, next) => {
  try {
    const invitation = await get(
      `SELECT gi.*, g.id AS group_id
       FROM group_invitations gi
       JOIN study_groups g ON g.id = gi.group_id
       WHERE gi.id = ? AND gi.invited_user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ success: false, message: `This invitation has already been ${invitation.status}.` });
    }

    const accept = req.body.accept === true || req.body.accept === 'true';
    const newStatus = accept ? 'accepted' : 'declined';

    await run(
      `UPDATE group_invitations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStatus, req.params.id]
    );

    if (accept) {
      await run(
        `INSERT INTO group_members (group_id, user_id, status)
         VALUES (?, ?, 'active')
         ON CONFLICT(group_id, user_id) DO UPDATE SET status = 'active', joined_at = CURRENT_TIMESTAMP`,
        [invitation.group_id, req.user.id]
      );
    }

    return res.json({
      success: true,
      message: accept ? 'Invitation accepted. You are now a member.' : 'Invitation declined.'
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
