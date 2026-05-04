# StudySync Deployment Guide

## Architecture

| Layer    | Host                         | Notes                              |
|----------|------------------------------|------------------------------------|
| Frontend | GSU Codd — `~/public_html`   | Static files built by Vite         |
| Backend  | Render web service           | Node.js / Express                  |
| Database | Render persistent disk       | SQLite at `/var/data/...`          |

---

## Prerequisites

- SSH access to `codd.cs.gsu.edu` with your GSU credentials
- A free [Render](https://render.com) account
- Node.js 18+ installed locally
- `rsync` available locally (Git Bash or WSL on Windows)

---

## 1. Deploy the Backend to Render

### 1a. Push your code to GitHub

Render deploys from a Git repository.

```bash
git add .
git commit -m "deployment: production config"
git push origin main
```

### 1b. Create a Render Web Service

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Set these fields:

| Field              | Value                          |
|--------------------|-------------------------------|
| Name               | `study-group-matcher`         |
| Root directory     | `server`                      |
| Environment        | `Node`                        |
| Build command      | `npm install`                 |
| Start command      | `node src/index.js`           |

### 1c. Add environment variables on Render

In the Render dashboard → **Environment** tab, add:

| Key              | Value                                        |
|------------------|----------------------------------------------|
| `NODE_ENV`       | `production`                                 |
| `PORT`           | `10000` (Render assigns this automatically)  |
| `JWT_SECRET`     | A long random string — generate with `openssl rand -hex 32` |
| `DATABASE_PATH`  | `/var/data/study-group-matcher.sqlite`       |
| `CORS_ORIGIN`    | The public URL of your GSU frontend (e.g. `https://codd.cs.gsu.edu/~yourusername`) |

> **Note:** Render injects `PORT` automatically. You can leave it out of the UI and the server will still pick it up.

### 1d. Attach a Persistent Disk

SQLite writes to disk — you must attach a persistent disk or all data will be lost on every redeploy.

1. In Render → your service → **Disks** tab → **Add Disk**
2. Set:

| Field        | Value                        |
|--------------|------------------------------|
| Name         | `sqlite-data`                |
| Mount path   | `/var/data`                  |
| Size         | `1 GB` (free tier allows 1 GB) |

3. **Deploy** the service. The `/var/data` directory will now persist across deploys and restarts.

### 1e. Verify the backend is live

Once deployed, visit:

```
https://<your-render-service>.onrender.com/api/health
```

You should see: `{"ok":true,"project":"study-group-matcher"}`

---

## 2. Deploy the Frontend to GSU Codd

### 2a. Set the production API URL

Create `client/.env.production` (do **not** commit this file):

```env
VITE_API_BASE_URL=https://<your-render-service>.onrender.com
```

Replace `<your-render-service>` with your actual Render URL.

### 2b. Build the frontend

Run from the repo root:

```bash
cd client
npm install
npm run build
```

The built files will be in `client/dist/`.

### 2c. Upload to GSU Codd

```bash
rsync -av --progress client/dist/ yourusername@codd.cs.gsu.edu:~/public_html/
```

Replace `yourusername` with your GSU username.

### 2d. Fix permissions on GSU (if needed)

If you see permission errors or a 403 in the browser:

```bash
ssh yourusername@codd.cs.gsu.edu
chmod 711 ~
chmod 755 ~/public_html
find ~/public_html -type d -exec chmod 755 {} \;
find ~/public_html -type f -exec chmod 644 {} \;
```

### 2e. Verify the frontend is live

Visit `https://codd.cs.gsu.edu/~yourusername/` in a browser.

Because the router uses hash mode, all routes look like:
```
https://codd.cs.gsu.edu/~yourusername/#/dashboard
```

Deep links and page refreshes work without any server config.

---

## 3. Verify Data Persistence

1. Register a new account on the live site
2. Create a study group
3. Restart the Render service (Dashboard → **Manual Deploy** → **Redeploy**)
4. Log back in — your group should still exist

If data disappears after redeploy, the persistent disk is not attached or `DATABASE_PATH` is not set correctly.

---

## 4. Environment Variable Reference

### Backend (`server/.env` for local dev, Render UI for production)

| Variable          | Local default                                    | Production value                                   |
|-------------------|--------------------------------------------------|----------------------------------------------------|
| `PORT`            | `3001`                                           | Set by Render automatically                        |
| `NODE_ENV`        | `development`                                    | `production`                                       |
| `DATABASE_PATH`   | *(auto: `server/data/study-group-matcher.sqlite`)* | `/var/data/study-group-matcher.sqlite`           |
| `JWT_SECRET`      | *(not required locally)*                         | Required — long random string                      |
| `CORS_ORIGIN`     | *(not set — allows all origins)*                 | `https://codd.cs.gsu.edu/~yourusername`            |

### Frontend (`client/.env.production` — local file, not committed)

| Variable            | Local dev | Production                                         |
|---------------------|-----------|----------------------------------------------------|
| `VITE_API_BASE_URL` | *(empty)* | `https://<your-render-service>.onrender.com`       |

---

## 5. Redeployment Checklist

### Backend update (code change):
1. `git push origin main`
2. Render auto-deploys if you enabled auto-deploy, otherwise click **Manual Deploy**

### Frontend update (code change):
1. `cd client && npm run build`
2. `rsync -av --progress client/dist/ yourusername@codd.cs.gsu.edu:~/public_html/`

---

## 6. Full Deployment Checklist (first time)

- [ ] Render web service created with correct root dir, build, and start commands
- [ ] All backend environment variables set in Render UI
- [ ] Persistent disk attached at `/var/data` on Render
- [ ] Backend health check returns `{"ok":true}`
- [ ] `client/.env.production` created locally with correct Render URL
- [ ] Frontend built with `npm run build`
- [ ] `dist/` uploaded to GSU via `rsync`
- [ ] GSU file permissions fixed if needed
- [ ] Frontend loads at `https://codd.cs.gsu.edu/~yourusername/`
- [ ] Registration and login work end-to-end
- [ ] Data persists after Render redeploy
