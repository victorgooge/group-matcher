PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'leader', 'admin')) DEFAULT 'student',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  major TEXT,
  bio TEXT,
  study_style TEXT,
  courses_json TEXT NOT NULL DEFAULT '[]',
  preferred_group_size INTEGER,
  is_looking_for_group INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS availability_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  leader_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  course_code TEXT NOT NULL,
  description TEXT NOT NULL,
  meeting_format TEXT NOT NULL CHECK (meeting_format IN ('In-Person', 'Online', 'Hybrid')),
  location TEXT,
  meeting_link TEXT,
  capacity INTEGER NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  preferred_study_style TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_join_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'removed')) DEFAULT 'active',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  location TEXT,
  notes TEXT,
  created_by INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled', 'rescheduled', 'missed')) DEFAULT 'scheduled',
  started_at DATETIME,
  completed_at DATETIME,
  cancelled_at DATETIME,
  rescheduled_at DATETIME,
  rescheduled_from_session_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rescheduled_from_session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'no_show')) DEFAULT 'absent',
  marked_by_user_id INTEGER,
  checked_in_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, user_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  rater_user_id INTEGER NOT NULL,
  rated_user_id INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  feedback_text TEXT,
  flagged INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, rater_user_id, rated_user_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (rater_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rated_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reliability_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  score INTEGER,
  attendance_rate REAL NOT NULL DEFAULT 0,
  peer_rating_avg REAL,
  no_show_count INTEGER NOT NULL DEFAULT 0,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  inviter_user_id INTEGER NOT NULL,
  invited_user_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, invited_user_id),
  FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE
);
