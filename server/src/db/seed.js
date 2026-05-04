import bcrypt from 'bcrypt';
import { initializeDatabase } from './init.js';
import { exec, run } from './helpers.js';

async function seed() {
  await exec(`
    DROP TABLE IF EXISTS group_invitations;
    DROP TABLE IF EXISTS reliability_snapshots;
    DROP TABLE IF EXISTS ratings;
    DROP TABLE IF EXISTS attendance;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS group_members;
    DROP TABLE IF EXISTS group_join_requests;
    DROP TABLE IF EXISTS study_groups;
    DROP TABLE IF EXISTS availability_blocks;
    DROP TABLE IF EXISTS profiles;
    DROP TABLE IF EXISTS users;
  `);

  await initializeDatabase();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Users: 4 students (one also leads groups), 1 teacher
  await run(
    `INSERT INTO users (name, email, password_hash, role) VALUES
     ('Alex Rivera', 'alex@example.com', ?, 'student'),
     ('Jamie Student', 'student1@example.com', ?, 'student'),
     ('Taylor Student', 'student2@example.com', ?, 'student'),
     ('Jordan Student', 'student3@example.com', ?, 'student'),
     ('Morgan Teacher', 'teacher@example.com', ?, 'teacher')`,
    [passwordHash, passwordHash, passwordHash, passwordHash, passwordHash]
  );

  await exec(`
    INSERT INTO profiles (user_id, major, bio, study_style, courses_json, preferred_group_size, is_looking_for_group) VALUES
    (1, 'Computer Science', 'Leads practical web programming review sessions. Keeps groups on track and focused.', 'Problem-solving', '["CSC 4370","CSC 3320"]', 5, 0),
    (2, 'Computer Science', 'Looking for consistent teammates for frontend and backend labs. Reliable and prepared.', 'Problem-solving', '["CSC 4370","MATH 2215"]', 4, 0),
    (3, 'Computer Science', 'Prefers collaborative whiteboard sessions and accountability check-ins.', 'Discussion-heavy', '["CSC 4370","CSC 2720"]', 6, 1),
    (4, 'Information Technology', 'New to the group matching system. Looking for a CSC 4370 group before the final.', 'Problem-solving', '["CSC 4370","CSC 2310"]', 4, 1),
    (5, 'Information Systems', 'Teacher account for platform oversight.', 'Mixed', '["CSC 4370"]', 4, 0);

    INSERT INTO availability_blocks (user_id, day_of_week, start_time, end_time) VALUES
    (1, 'Monday', '15:00', '18:00'),
    (1, 'Wednesday', '16:00', '19:00'),
    (2, 'Monday', '16:00', '18:00'),
    (2, 'Thursday', '17:00', '20:00'),
    (3, 'Wednesday', '17:00', '20:00'),
    (3, 'Saturday', '10:00', '13:00'),
    (4, 'Monday', '15:00', '18:00'),
    (4, 'Wednesday', '16:00', '19:00');

    INSERT INTO study_groups (leader_id, title, course_code, description, meeting_format, location, meeting_link, capacity, tags_json, preferred_study_style) VALUES
    (1, 'CSC 4370 Demo Day Prep', 'CSC 4370', 'Build confidence with Vue, Express, SQLite, and demo walkthrough practice. We meet twice a week and keep sessions focused.', 'Hybrid', 'Library North 3F', 'https://meet.example.com/csc4370-demo', 6, '["Vue","API","Demo"]', 'Problem-solving'),
    (1, 'CSC 3320 Backend Review', 'CSC 3320', 'Small backend-focused group for SQL, APIs, and debugging practice. Prefer students who come prepared.', 'Online', 'Discord', 'https://meet.example.com/csc3320-review', 5, '["Node","SQL"]', 'Problem-solving');

    INSERT INTO group_members (group_id, user_id, status) VALUES
    (1, 1, 'active'),
    (1, 2, 'active'),
    (1, 3, 'active'),
    (2, 1, 'active');

    INSERT INTO group_join_requests (group_id, user_id, status) VALUES
    (2, 3, 'pending');
  `);

  // Sessions: one completed (with full attendance + ratings), one past-scheduled (will be reconciled to missed), one scheduled future, one active demo
  await exec(`
    INSERT INTO sessions (group_id, title, scheduled_at, duration_minutes, location, notes, created_by, status, started_at, completed_at) VALUES
    (1, 'Vue Router + Pinia Review', '2026-04-12T18:00:00.000Z', 90, 'Library North 3F', 'Covered auth guards and store setup. Good session overall.', 1, 'completed', '2026-04-12T18:02:00.000Z', '2026-04-12T19:35:00.000Z'),
    (1, 'Express + SQLite Missed Session', '2026-04-20T22:00:00.000Z', 120, 'Hybrid', 'This session was never started and the time has passed.', 1, 'missed', NULL, NULL),
    (1, 'Final Project Dry Run', '2026-06-01T17:00:00.000Z', 120, 'Library North 3F', 'Full walkthrough of the demo before submission. Come with your part ready.', 1, 'scheduled', NULL, NULL);

    INSERT INTO attendance (session_id, user_id, status, marked_by_user_id, checked_in_at) VALUES
    (1, 1, 'present', 1, '2026-04-12T18:05:00.000Z'),
    (1, 2, 'present', NULL, '2026-04-12T18:08:00.000Z'),
    (1, 3, 'no_show', 1, NULL);

    INSERT INTO ratings (session_id, rater_user_id, rated_user_id, score, feedback_text, flagged) VALUES
    (1, 1, 2, 5, 'Prepared and reliable. Took good notes and asked useful questions.', 0),
    (1, 2, 1, 5, 'Kept the group on task and explained things clearly. Great leader.', 0);

    INSERT INTO group_invitations (group_id, inviter_user_id, invited_user_id, status) VALUES
    (1, 1, 4, 'pending');
  `);
}

seed()
  .then(() => {
    console.log('Database seeded with demo data.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed database:', error.message);
    process.exit(1);
  });
