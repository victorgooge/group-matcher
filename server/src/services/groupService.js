import { all, get } from '../db/helpers.js';

function normalizeJsonArray(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function countAvailabilityOverlap(userBlocks, leaderBlocks) {
  let overlaps = 0;

  for (const userBlock of userBlocks) {
    for (const leaderBlock of leaderBlocks) {
      if (userBlock.day_of_week !== leaderBlock.day_of_week) {
        continue;
      }

      if (userBlock.start_time < leaderBlock.end_time && userBlock.end_time > leaderBlock.start_time) {
        overlaps += 1;
      }
    }
  }

  return overlaps;
}

export async function getMatchContext(userId) {
  const profile = await get(
    `SELECT study_style, courses_json
     FROM profiles
     WHERE user_id = ?`,
    [userId]
  );

  const availability = await all(
    `SELECT day_of_week, start_time, end_time
     FROM availability_blocks
     WHERE user_id = ?`,
    [userId]
  );

  return {
    courses: normalizeJsonArray(profile?.courses_json),
    studyStyle: profile?.study_style ?? '',
    availability
  };
}

export async function buildMatchDetails(group, userId, reliabilityScore) {
  if (!userId) {
    return { matchScore: null, matchReasons: [] };
  }

  const viewer = await getMatchContext(userId);
  const leader = await getMatchContext(group.leader_id);
  const reasons = [];
  let score = 0;

  if (viewer.courses.some((course) => course.toLowerCase() === group.course_code.toLowerCase())) {
    score += 40;
    reasons.push('Same course section');
  }

  const overlapCount = countAvailabilityOverlap(viewer.availability, leader.availability);
  if (overlapCount > 0) {
    score += Math.min(overlapCount * 10, 30);
    reasons.push(`${overlapCount} overlapping time block${overlapCount === 1 ? '' : 's'}`);
  }

  if (
    viewer.studyStyle &&
    group.preferred_study_style &&
    viewer.studyStyle.toLowerCase() === group.preferred_study_style.toLowerCase()
  ) {
    score += 10;
    reasons.push('Shared study style');
  }

  if (reliabilityScore !== null && reliabilityScore >= 75) {
    score += 15;
    reasons.push('High reliability score');
  }

  return {
    matchScore: score,
    matchReasons: reasons
  };
}
