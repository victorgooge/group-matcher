import assert from 'node:assert/strict';
import { computeReliabilitySnapshot, getReliabilityLabel } from './reliabilityService.js';

function runTests() {
  const emptySnapshot = computeReliabilitySnapshot({});
  assert.equal(emptySnapshot.score, null);
  assert.equal(emptySnapshot.label, 'New');
  assert.equal(emptySnapshot.hasHistory, false);

  const populatedSnapshot = computeReliabilitySnapshot({
    attendanceCount: 8,
    totalAttendanceCount: 10,
    peerRatingAverage: 4.5,
    noShowCount: 1
  });
  assert.equal(populatedSnapshot.score, 78);
  assert.equal(populatedSnapshot.label, 'Reliable');
  assert.equal(populatedSnapshot.hasEnoughRatings, true);

  assert.equal(getReliabilityLabel(95, true), 'Highly Reliable');
  assert.equal(getReliabilityLabel(80, true), 'Reliable');
  assert.equal(getReliabilityLabel(60, true), 'Mixed');
  assert.equal(getReliabilityLabel(20, true), 'Low Reliability');

  console.log('Reliability service tests passed.');
}

runTests();
