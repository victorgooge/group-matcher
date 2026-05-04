import { all, get } from '../db/helpers.js';

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getReliabilityLabel(score, hasHistory) {
  if (!hasHistory || score === null || score === undefined) return 'New';
  if (score >= 90) return 'Highly Reliable';
  if (score >= 75) return 'Reliable';
  if (score >= 50) return 'Mixed';
  return 'Low Reliability';
}

export function computeReliabilitySnapshot({
  attendanceCount = 0,
  totalAttendanceCount = 0,
  peerRatingAverage = null,
  noShowCount = 0
}) {
  const attendanceRate = totalAttendanceCount > 0 ? attendanceCount / totalAttendanceCount : 0;
  const noShowPenalty = noShowCount * 5;
  const hasEnoughRatings = peerRatingAverage !== null;
  const peerComponent = hasEnoughRatings ? (peerRatingAverage / 5) * 30 : 0;
  const rawScore = Math.round((attendanceRate * 70) + peerComponent - noShowPenalty);
  const hasHistory = totalAttendanceCount > 0 || hasEnoughRatings;
  const score = hasHistory ? clamp(rawScore, 0, 100) : null;

  return {
    score,
    label: getReliabilityLabel(score, hasHistory),
    attendanceRate,
    attendanceCount,
    totalAttendanceCount,
    peerRatingAverage,
    noShowCount,
    noShowPenalty,
    hasEnoughRatings,
    hasHistory
  };
}

// Only count attendance records from completed sessions so in-progress or missed
// sessions do not skew the score before they are finalized.
export async function getUserReliability(userId) {
  const attendanceRows = await all(
    `SELECT a.status
     FROM attendance a
     JOIN sessions s ON s.id = a.session_id
     WHERE a.user_id = ? AND s.status = 'completed'`,
    [userId]
  );

  const ratingSummary = await get(
    `SELECT
       AVG(r.score) AS peer_rating_average,
       COUNT(*) AS rating_count
     FROM ratings r
     JOIN sessions s ON s.id = r.session_id
     WHERE r.rated_user_id = ? AND s.status = 'completed'`,
    [userId]
  );

  const attendanceCount = attendanceRows.filter((row) => row.status === 'present').length;
  const totalAttendanceCount = attendanceRows.length;
  const noShowCount = attendanceRows.filter((row) => row.status === 'no_show').length;
  const ratingCount = Number(ratingSummary?.rating_count ?? 0);
  const peerRatingAverage =
    ratingCount >= 2 && ratingSummary?.peer_rating_average !== null
      ? Number(ratingSummary.peer_rating_average)
      : null;

  return {
    ...computeReliabilitySnapshot({
      attendanceCount,
      totalAttendanceCount,
      peerRatingAverage,
      noShowCount
    }),
    ratingCount
  };
}
