import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './init.js';
import { exec, run } from './helpers.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(currentDirectory, '../../data/study-group-matcher.sqlite');

async function seed() {
  const dbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : defaultDbPath;
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  await initializeDatabase();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  await run(
    `INSERT INTO users (name, email, password_hash, role) VALUES
     ('Alex Leader', 'leader1@example.com', ?, 'leader'),
     ('Jamie Student', 'student1@example.com', ?, 'student'),
     ('Taylor Student', 'student2@example.com', ?, 'student'),
     ('Morgan Admin', 'admin1@example.com', ?, 'admin')`,
    [passwordHash, passwordHash, passwordHash, passwordHash]
  );

  await exec(`
    INSERT INTO profiles (user_id, major, bio, study_style, courses_json, preferred_group_size) VALUES
    (1, 'Computer Science', 'Leads practical web programming review sessions.', 'Problem-solving', '["CSC 4370","CSC 3320"]', 5),
    (2, 'Computer Science', 'Looking for consistent teammates for frontend and backend labs.', 'Problem-solving', '["CSC 4370","MATH 2215"]', 4),
    (3, 'Computer Science', 'Prefers collaborative whiteboard sessions and accountability check-ins.', 'Discussion-heavy', '["CSC 4370","CSC 2720"]', 6),
    (4, 'Information Systems', 'Optional admin demo account.', 'Mixed', '["CSC 4370"]', 4);

    INSERT INTO availability_blocks (user_id, day_of_week, start_time, end_time) VALUES
    (1, 'Monday', '15:00', '18:00'),
    (1, 'Wednesday', '16:00', '19:00'),
    (2, 'Monday', '16:00', '18:00'),
    (2, 'Thursday', '17:00', '20:00'),
    (3, 'Wednesday', '17:00', '20:00'),
    (3, 'Saturday', '10:00', '13:00');

    INSERT INTO study_groups (leader_id, title, course_code, description, meeting_format, location, meeting_link, capacity, tags_json, preferred_study_style) VALUES
    (1, 'CSC 4370 Demo Day Prep', 'CSC 4370', 'Build confidence with Vue, Express, SQLite, and demo walkthrough practice.', 'Hybrid', 'Library North 3F', 'https://meet.example.com/csc4370-demo', 6, '["Vue","API","Demo"]', 'Problem-solving'),
    (1, 'CSC 3320 Backend Review', 'CSC 3320', 'Small backend-focused group for SQL, APIs, and debugging practice.', 'Online', 'Discord', 'https://meet.example.com/csc3320-review', 5, '["Node","SQL"]', 'Problem-solving');

    INSERT INTO group_members (group_id, user_id, status) VALUES
    (1, 1, 'active'),
    (1, 2, 'active'),
    (1, 3, 'active'),
    (2, 1, 'active');

    INSERT INTO group_join_requests (group_id, user_id, status) VALUES
    (2, 3, 'pending');

    INSERT INTO sessions (group_id, title, scheduled_at, duration_minutes, location, notes, created_by, status) VALUES
    (1, 'Vue Router + Pinia Review', '2026-04-12T18:00:00.000Z', 90, 'Library North 3F', 'Covered auth guards and store setup.', 1, 'completed'),
    (1, 'Express + SQLite Build Session', '2026-04-20T22:00:00.000Z', 120, 'Hybrid', 'Upcoming full-stack practice session.', 1, 'scheduled');

    INSERT INTO attendance (session_id, user_id, status, marked_by_user_id) VALUES
    (1, 1, 'present', 1),
    (1, 2, 'present', 1),
    (1, 3, 'no_show', 1);

    INSERT INTO ratings (session_id, rater_user_id, rated_user_id, score, feedback_text, flagged) VALUES
    (1, 1, 2, 5, 'Prepared and reliable during the review session.', 0),
    (1, 2, 1, 5, 'Kept the group organized and on task.', 0);
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
