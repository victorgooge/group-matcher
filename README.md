# StudySync — Reliability-Aware Study Group Matcher

A full-stack web application that helps college students create and join study groups, track session attendance, rate peers, and surface a reliability score that improves future group matching.

Built for **CSC 4370 — Web Programming** at Georgia State University.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3, Vite, Vue Router, Pinia, Heroicons |
| Backend | Node.js, Express |
| Database | SQLite (via `better-sqlite3`) |
| Auth | JWT (Bearer token, 7-day expiry) |

---

## Features

### Accounts & Profiles
- Register as **Student** or **Teacher**
- Edit academic profile: major, bio, study style, course list
- Manage recurring weekly availability blocks
- View your own reliability score and history

### Groups
- Any student can create a group and become its leader
- Browse and search groups by course code or title, filtered by meeting format
- Groups are ranked by a computed match score (course overlap, schedule overlap, study style, reliability)
- Match reasons are displayed on each card so students can evaluate fit at a glance
- Group cards dim groups you already belong to
- Leaders and members see different layouts on the group detail page

### Membership
- Students submit join requests; leaders approve or reject them
- Approved members gain access to the group meeting link
- Leaders can remove members at any time
- Leaders can search for matched students and send direct invitations
- Invited students accept or decline from their dashboard

### Sessions
- Leaders schedule sessions with title, date, duration, location, and notes
- Session status lifecycle: `scheduled` → `active` → `completed` (or `cancelled` / `missed` / `rescheduled`)
- Stale sessions are automatically promoted to `missed` when their scheduled time passes
- Members self-check-in during active sessions from the session detail page
- Leaders complete sessions, automatically marking anyone who did not check in as absent
- Leaders can manually override attendance records after the fact

### Reliability & Ratings
- After a session is completed, attending members can rate each other (1–5 stars, optional text)
- Ratings are restricted to members who were marked present in the same session
- One rating per rater–ratee–session combination enforced at the database level
- Reliability score formula: `clamp(round(attendance_rate × 70 + (avg_rating / 5) × 30 − no_show_penalty), 0, 100)`
- Score tiers with contextual icons throughout the UI:
  - **Highly Reliable** (≥ 90) — verified badge
  - **Reliable** (≥ 75) — thumbs up
  - **Mixed** (≥ 50) — exclamation circle
  - **Low Reliability** (< 50) — warning triangle
  - **New** (no history) — sparkle

### Dashboard
- Reliability summary panel with attendance rate, peer rating average, and no-show count
- Upcoming sessions panel (sorted by date, across all your groups)
- Live session alert when any of your groups has an active session
- Your Groups panel split into Led by You and Joined sections
- Suggested groups ranked by match score
- Onboarding checklist that auto-hides after setup is complete

---

## Role System

| Role | Account Level | What it means |
|---|---|---|
| Student | `student` | Default role. Can create groups (becoming leader contextually), join groups, attend sessions, and rate peers. |
| Teacher | `teacher` | Same as Student plus platform-level admin permissions. |
| Leader | per-group | The student who created the group. Manages requests, sessions, attendance, and invitations for that group only. |
| Member | per-group | An approved student in a group. Can check in and rate peers. |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install

```bash
npm install          # installs root workspace deps
cd client && npm install
cd ../server && npm install
```

### Seed the database

```bash
cd server
npm run db:seed
```

This drops and recreates the database with demo users, groups, sessions, and attendance records. All demo accounts use the password **`Password123!`**.

| Name | Email | Role |
|---|---|---|
| Alex Rivera | alex@example.com | Student (leads 2 groups) |
| Jamie Student | student1@example.com | Student |
| Taylor Student | student2@example.com | Student |
| Jordan Student | student3@example.com | Student |
| Morgan Teacher | teacher@example.com | Teacher |

### Run in development

```bash
# from project root
npm run dev
```

This starts both the Express server (port 3000) and the Vite dev server (port 5173) concurrently. The Vite proxy forwards `/api` requests to the Express server.

---

## Project Structure

```
study-group-matcher/
├── client/                 # Vue 3 frontend
│   ├── src/
│   │   ├── assets/         # Global CSS (base.css)
│   │   ├── components/     # AppHeader, GroupCard, ReliabilityBadge
│   │   ├── services/       # api.js (all fetch wrappers)
│   │   ├── stores/         # Pinia auth store
│   │   └── views/          # Page-level Vue components
│   └── vite.config.js
├── server/
│   └── src/
│       ├── db/             # schema.sql, seed.js, helpers, init
│       ├── middleware/      # requireAuth, requireRole
│       ├── routes/         # auth, users, groups, sessions, invitations
│       └── services/       # reliabilityService, groupService
├── docs/                   # Report, deployment guide, architecture notes
└── package.json            # Workspace root with concurrently dev script
```

---

## API Overview

All endpoints are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

| Domain | Key Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Users | `GET/PUT /users/me`, `POST/DELETE /users/me/availability`, `GET /users/:id/reliability` |
| Groups | `GET/POST /groups`, `GET /groups/mine`, `GET/PUT/DELETE /groups/:id` |
| Membership | `POST /groups/:id/join-request`, approve/reject, remove member, invitations |
| Sessions | `GET /sessions/upcoming`, `POST /groups/:id/sessions`, start/complete/cancel/reschedule |
| Attendance | `POST /sessions/:id/check-in`, `POST /sessions/:id/attendance` |
| Ratings | `POST /sessions/:id/ratings` |
| Invitations | `GET /invitations`, `PATCH /invitations/:id/respond` |

---

## Reliability Score

```
Score = clamp(round(A × 70 + (R / 5) × 30 − P), 0, 100)
```

- **A** — attendance rate (0–1)
- **R** — average peer rating (0–5)
- **P** — no-show penalty (10 points per confirmed no-show)

Attendance is weighted at 70% because it is the primary observable signal of dependability. Peer ratings contribute 30% as a qualitative layer.

---

## Deployment

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for instructions on deploying to Render (backend) and a static host (frontend).

---

## Academic Context

This project was submitted as the CSC 4370 Web Programming final project at Georgia State University. The paper accompanying this repository is available at [victorGooge_finalProjectREPORT.tex](victorGooge_finalProjectREPORT.tex).

**Author:** Victor Googe — vgooge1@student.gsu.edu

**GitHub:** [victorgooge/study-sync](https://github.com/victorgooge/study-sync)