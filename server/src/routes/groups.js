import express from 'express';
import { all, get, run } from '../db/helpers.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { buildMatchDetails } from '../services/groupService.js';
import { getUserReliability } from '../services/reliabilityService.js';

const router = express.Router();

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

async function getGroup(groupId) {
  return get(
    `SELECT
       g.*,
       u.name AS leader_name,
       COUNT(CASE WHEN gm.status = 'active' THEN gm.id END) AS active_member_count
     FROM study_groups g
     JOIN users u ON u.id = g.leader_id
     LEFT JOIN group_members gm ON gm.group_id = g.id
     WHERE g.id = ?
     GROUP BY g.id`,
    [groupId]
  );
}

async function isGroupLeader(groupId, userId) {
  const group = await get(`SELECT leader_id FROM study_groups WHERE id = ?`, [groupId]);
  return group && Number(group.leader_id) === Number(userId);
}

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const format = String(req.query.meetingFormat || '').trim();

    const groups = await all(
      `SELECT
         g.*,
         u.name AS leader_name,
         COUNT(CASE WHEN gm.status = 'active' THEN gm.id END) AS active_member_count
       FROM study_groups g
       JOIN users u ON u.id = g.leader_id
       LEFT JOIN group_members gm ON gm.group_id = g.id
       WHERE (? = '' OR LOWER(g.course_code) LIKE '%' || ? || '%' OR LOWER(g.title) LIKE '%' || ? || '%')
         AND (? = '' OR g.meeting_format = ?)
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [search, search, search, format, format]
    );

    let viewerReliability = null;
    if (req.user?.id) {
      viewerReliability = await getUserReliability(req.user.id);
    }

    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        const joinRequest = req.user?.id
          ? await get(
              `SELECT status
               FROM group_join_requests
               WHERE group_id = ? AND user_id = ?`,
              [group.id, req.user.id]
            )
          : null;

        const membership = req.user?.id
          ? await get(
              `SELECT status
               FROM group_members
               WHERE group_id = ? AND user_id = ?`,
              [group.id, req.user.id]
            )
          : null;

        const matchDetails = await buildMatchDetails(group, req.user?.id, viewerReliability?.score ?? null);

        return {
          id: group.id,
          title: group.title,
          courseCode: group.course_code,
          description: group.description,
          meetingFormat: group.meeting_format,
          location: group.location,
          meetingLink: group.meeting_link,
          capacity: group.capacity,
          tags: JSON.parse(group.tags_json ?? '[]'),
          preferredStudyStyle: group.preferred_study_style,
          leader: {
            id: group.leader_id,
            name: group.leader_name
          },
          activeMemberCount: Number(group.active_member_count ?? 0),
          joinRequestStatus: joinRequest?.status ?? null,
          isMember: membership?.status === 'active',
          ...matchDetails
        };
      })
    );

    const sortedGroups = enrichedGroups.sort((left, right) => {
      if ((right.matchScore ?? -1) === (left.matchScore ?? -1)) {
        return right.id - left.id;
      }

      return (right.matchScore ?? -1) - (left.matchScore ?? -1);
    });

    return res.json({ success: true, data: { groups: sortedGroups } });
  } catch (error) {
    return next(error);
  }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const groups = await all(
      `SELECT DISTINCT
         g.id,
         g.title,
         g.course_code,
         g.meeting_format,
         g.location
       FROM study_groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.status = 'active'
       WHERE g.leader_id = ? OR gm.user_id = ?
       ORDER BY g.created_at DESC`,
      [req.user.id, req.user.id]
    );

    return res.json({ success: true, data: { groups } });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAuth, requireRole('leader', 'admin'), async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const courseCode = String(req.body.courseCode || '').trim();
    const description = String(req.body.description || '').trim();
    const meetingFormat = String(req.body.meetingFormat || '').trim();
    const location = String(req.body.location || '').trim();
    const meetingLink = String(req.body.meetingLink || '').trim();
    const preferredStudyStyle = String(req.body.preferredStudyStyle || '').trim();
    const capacity = Number(req.body.capacity);
    const tags = parseJsonArray(req.body.tags);

    if (!title || !courseCode || !description || !meetingFormat || !capacity) {
      return res.status(400).json({ success: false, message: 'Title, course code, description, format, and capacity are required.' });
    }

    const result = await run(
      `INSERT INTO study_groups
       (leader_id, title, course_code, description, meeting_format, location, meeting_link, capacity, tags_json, preferred_study_style)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title,
        courseCode,
        description,
        meetingFormat,
        location,
        meetingLink,
        capacity,
        JSON.stringify(tags),
        preferredStudyStyle
      ]
    );

    await run(
      `INSERT INTO group_members (group_id, user_id, status)
       VALUES (?, ?, 'active')`,
      [result.lastID, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Study group created successfully.',
      data: { id: result.lastID }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const group = await getGroup(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const members = await all(
      `SELECT u.id, u.name, u.role, gm.status
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ? AND gm.status = 'active'
       ORDER BY CASE WHEN u.id = ? THEN 0 ELSE 1 END, u.name`,
      [req.params.id, group.leader_id]
    );

    const membersWithReliability = await Promise.all(
      members.map(async (member) => ({
        ...member,
        reliability: await getUserReliability(member.id)
      }))
    );

    const sessions = await all(
      `SELECT id, title, scheduled_at, duration_minutes, location, notes, status
       FROM sessions
       WHERE group_id = ?
       ORDER BY scheduled_at DESC`,
      [req.params.id]
    );

    const joinRequestStatus = req.user?.id
      ? await get(
          `SELECT status
           FROM group_join_requests
           WHERE group_id = ? AND user_id = ?`,
          [req.params.id, req.user.id]
        )
      : null;

    const isMember = req.user?.id
      ? await get(
          `SELECT status
           FROM group_members
           WHERE group_id = ? AND user_id = ?`,
          [req.params.id, req.user.id]
        )
      : null;

    const pendingRequests =
      req.user?.id && Number(req.user.id) === Number(group.leader_id)
        ? await all(
            `SELECT gjr.id, gjr.user_id, gjr.status, gjr.created_at, u.name, u.email
             FROM group_join_requests gjr
             JOIN users u ON u.id = gjr.user_id
             WHERE gjr.group_id = ? AND gjr.status = 'pending'
             ORDER BY gjr.created_at ASC`,
            [req.params.id]
          )
        : [];

    return res.json({
      success: true,
      data: {
        group: {
          id: group.id,
          title: group.title,
          courseCode: group.course_code,
          description: group.description,
          meetingFormat: group.meeting_format,
          location: group.location,
          meetingLink: group.meeting_link,
          capacity: group.capacity,
          tags: JSON.parse(group.tags_json ?? '[]'),
          preferredStudyStyle: group.preferred_study_style,
          leader: {
            id: group.leader_id,
            name: group.leader_name
          },
          activeMemberCount: Number(group.active_member_count ?? 0),
          joinRequestStatus: joinRequestStatus?.status ?? null,
          isMember: isMember?.status === 'active',
          isLeader: Number(req.user?.id) === Number(group.leader_id)
        },
        members: membersWithReliability,
        sessions,
        pendingRequests
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const ownsGroup = await isGroupLeader(req.params.id, req.user.id);
    if (!ownsGroup && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can edit this group.' });
    }

    const title = String(req.body.title || '').trim();
    const courseCode = String(req.body.courseCode || '').trim();
    const description = String(req.body.description || '').trim();
    const meetingFormat = String(req.body.meetingFormat || '').trim();
    const location = String(req.body.location || '').trim();
    const meetingLink = String(req.body.meetingLink || '').trim();
    const preferredStudyStyle = String(req.body.preferredStudyStyle || '').trim();
    const capacity = Number(req.body.capacity);
    const tags = parseJsonArray(req.body.tags);

    await run(
      `UPDATE study_groups
       SET title = ?, course_code = ?, description = ?, meeting_format = ?, location = ?, meeting_link = ?, capacity = ?, tags_json = ?, preferred_study_style = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title,
        courseCode,
        description,
        meetingFormat,
        location,
        meetingLink,
        capacity,
        JSON.stringify(tags),
        preferredStudyStyle,
        req.params.id
      ]
    );

    return res.json({ success: true, message: 'Group updated successfully.' });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const ownsGroup = await isGroupLeader(req.params.id, req.user.id);
    if (!ownsGroup && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can delete this group.' });
    }

    await run(`DELETE FROM study_groups WHERE id = ?`, [req.params.id]);
    return res.json({ success: true, message: 'Group deleted.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/join-request', requireAuth, async (req, res, next) => {
  try {
    const group = await get(`SELECT id, leader_id FROM study_groups WHERE id = ?`, [req.params.id]);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (Number(group.leader_id) === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Leaders are already part of their own groups.' });
    }

    const membership = await get(
      `SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'active'`,
      [req.params.id, req.user.id]
    );

    if (membership) {
      return res.status(409).json({ success: false, message: 'You are already a member of this group.' });
    }

    const existingRequest = await get(
      `SELECT id, status FROM group_join_requests WHERE group_id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (existingRequest && existingRequest.status === 'pending') {
      return res.status(409).json({ success: false, message: 'This join request already exists.' });
    }

    if (existingRequest) {
      await run(
        `UPDATE group_join_requests
         SET status = 'pending', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [existingRequest.id]
      );
    } else {
      await run(
        `INSERT INTO group_join_requests (group_id, user_id, status)
         VALUES (?, ?, 'pending')`,
        [req.params.id, req.user.id]
      );
    }

    return res.status(201).json({ success: true, message: 'Join request submitted.' });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/requests', requireAuth, async (req, res, next) => {
  try {
    const ownsGroup = await isGroupLeader(req.params.id, req.user.id);
    if (!ownsGroup && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can review requests.' });
    }

    const requests = await all(
      `SELECT gjr.id, gjr.status, gjr.created_at, u.id AS user_id, u.name, u.email
       FROM group_join_requests gjr
       JOIN users u ON u.id = gjr.user_id
       WHERE gjr.group_id = ?
       ORDER BY gjr.created_at ASC`,
      [req.params.id]
    );

    return res.json({ success: true, data: { requests } });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/requests/:requestId/approve', requireAuth, async (req, res, next) => {
  try {
    const ownsGroup = await isGroupLeader(req.params.id, req.user.id);
    if (!ownsGroup && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can approve requests.' });
    }

    const request = await get(
      `SELECT id, user_id, status
       FROM group_join_requests
       WHERE id = ? AND group_id = ?`,
      [req.params.requestId, req.params.id]
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Join request not found.' });
    }

    await run(
      `UPDATE group_join_requests
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.params.requestId]
    );

    await run(
      `INSERT INTO group_members (group_id, user_id, status)
       VALUES (?, ?, 'active')
       ON CONFLICT(group_id, user_id)
       DO UPDATE SET status = 'active', joined_at = CURRENT_TIMESTAMP`,
      [req.params.id, request.user_id]
    );

    return res.json({ success: true, message: 'Join request approved.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/requests/:requestId/reject', requireAuth, async (req, res, next) => {
  try {
    const ownsGroup = await isGroupLeader(req.params.id, req.user.id);
    if (!ownsGroup && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can reject requests.' });
    }

    await run(
      `UPDATE group_join_requests
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND group_id = ?`,
      [req.params.requestId, req.params.id]
    );

    return res.json({ success: true, message: 'Join request rejected.' });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id/members/:memberId', requireAuth, async (req, res, next) => {
  try {
    const ownsGroup = await isGroupLeader(req.params.id, req.user.id);
    if (!ownsGroup && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group leader can remove members.' });
    }

    if (Number(req.params.memberId) === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Leaders cannot remove themselves from their own group.' });
    }

    const result = await run(
      `UPDATE group_members
       SET status = 'removed'
       WHERE group_id = ? AND user_id = ?`,
      [req.params.id, req.params.memberId]
    );

    if (!result.changes) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    return res.json({ success: true, message: 'Member removed from the group.' });
  } catch (error) {
    return next(error);
  }
});

export default router;
