# MeshBoard Super-Node — Railway Deployment Guide

## Overview

The MeshBoard Super-Node consists of two services that deploy separately to Railway:
1. **Backend** — Node.js/Express API server
2. **Frontend** — React/Vite web dashboard

Both services are in this repository but deploy independently.

### Live production URLs

| Client | Base URL | Notes |
|--------|----------|--------|
| **Backend API** | `https://meshboard-super-node.up.railway.app` | Health: `/health`, REST: `/api/...` |
| **Web dashboard** | Set `VITE_API_BASE_URL` to `https://meshboard-super-node.up.railway.app/api` | Rebuild frontend after changing |
| **Android app** | `https://meshboard-super-node.up.railway.app` | **No** `/api` suffix — Retrofit appends `api/posts`, `api/sync`, etc. |

> The old placeholder `meshboard-backend.up.railway.app` is **not** deployed. Use `meshboard-super-node` only.

**Android (existing installs):** If the app still has the old URL in preferences, open **Mesh → Railway Server Sync** and paste `https://meshboard-super-node.up.railway.app`, or clear app data.

See **[MOBILE_AND_SYNC.md](./MOBILE_AND_SYNC.md)** for credits (local 5.0 vs server 0), post approval → feed, and operator testing steps.

---

## Pre-Deployment Checklist

- ✅ Backend database connection uses `DATABASE_URL` with SSL
- ✅ Frontend API client uses `VITE_API_BASE_URL` environment variable
- ✅ `package.json` has `"start": "node index.js"`
- ✅ Optional auto-migrations configured via `RUN_MIGRATIONS` env var
- ✅ CORS origins configured via `ALLOWED_ORIGINS`

---

## Deployment Steps

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app)[cite: 1]
2. Create a new project
3. Add a PostgreSQL service (Railway will create `DATABASE_URL` automatically)

### 2. Deploy Backend Service

```bash
# Login to Railway
railway login

# Link this repo to your Railway project
railway link

# Deploy backend (from root directory)
railway deploy
In Railway Dashboard for Backend Service:

  
MD

Set Name: meshboard-super-node (SUPERNODE-ARUSHA-01)  
MD

Root Directory: Backend

  
MD

Under Variables, add these after linking PostgreSQL:  
MD

Variable	Value
NODE_ENV	production
SUPERNODE_ID	SUPERNODE-ARUSHA-01 (or your node name)
TOKEN_EXPIRY_HOURS	48
ALLOWED_ORIGINS	Your dashboard URL, e.g. https://your-frontend.up.railway.app
RUN_MIGRATIONS	false (run manually via shell once to avoid delaying startup/blocking health checks)
DATABASE_URL	${{ DATABASE.URL }} (reference variable from PostgreSQL service)
3. Run Migrations (First Time Only)
After backend service starts:  
MD

Bash
# Via Railway CLI:
railway shell

# Inside the shell:
node migrate.js
exit
Alternative: Set RUN_MIGRATIONS=true temporarily, trigger a deploy, and immediately set it back to false once complete.  
MD

4. Seed Database (Optional)
Bash
railway shell
node seed.js
5. Deploy Frontend Service
Add a new Railway service linked to this repo  
MD

Root Directory: Frontend

  
MD

Build/start commands: use Frontend/railway.toml (build via nixpacks, start node serve.js)  
MD

Environment Variables for Frontend (set before build):

  
MD

Variable	Value
VITE_API_BASE_URL	https://meshboard-super-node.up.railway.app/api
VITE_SUPERNODE_ID	SUPERNODE-ARUSHA-01
⚠️ Important: Vite bakes environment variables directly into the client-side bundle during the build step. If you change VITE_API_BASE_URL later in the Railway UI, you must hit Redeploy to trigger a fresh rebuild.  
MD

6. Update Backend CORS
Set backend ALLOWED_ORIGINS to your deployed frontend origin (exact URL, including protocol):  
MD

ALLOWED_ORIGINS=[https://your-frontend.up.railway.app](https://your-frontend.up.railway.app)
Accessing the Deployment
Backend: https://meshboard-super-node.up.railway.app

  
MD

Health: https://meshboard-super-node.up.railway.app/health

  
MD

Frontend: your frontend Railway URL (set ALLOWED_ORIGINS to match)  
MD

Monitoring
Logs
Bash
railway logs -s meshboard-super-node
railway logs -s meshboard-frontend
Database
Railway PostgreSQL is accessible directly. To connect:  
MD

Bash
railway connect -s postgres
Scheduler Status
The background scheduler is built into the backend service. Logs will show:  
MD

[scheduler] Background jobs started
[scheduler] Expired 0 token(s)
[scheduler] Queued expiry cleanup for 0 post(s)
Troubleshooting
"buildCommand and startCommand cannot be the same"
Backend startCommand must be node index.js (not npm start).  
MD

Frontend buildCommand = npm run build, startCommand = node serve.js.  
MD

In Railway Dashboard → service → Settings, clear any custom Build Command / Start Command that both say npm start (UI overrides repo config).  
MD

Remove duplicate [start] from nixpacks.toml — only railway.toml should define how the server starts.  
MD

"Activity heartbeat timeout" / deploy keeps failing
Root directory — Each service must use its own folder:  
MD

Backend service → Root Directory: Backend

  
MD

Frontend service → Root Directory: Frontend

  
MD

Health checks — Both services expose GET /health (frontend and backend). Do not point healthcheck at /api/....  
MD

RUN_MIGRATIONS — Keep false on Railway unless running a one-time setup. If set to true, a long-running migration script might block the server from listening, causing Railway's health check to time out and fail the deployment.  
MD

Frontend build — vite is a devDependency. The Frontend nixpacks.toml runs npm install --include=dev then npm run build. If build logs show vite: not found, redeploy after pulling latest config.  
MD

DATABASE_URL — Backend must reference PostgreSQL using your project's dynamic variable environment template, such as ${{ Postgres.DATABASE_URL }}. Never hardcode plaintext database connection strings inside repository configurations or files.  
MD

Redeploy both services after pushing these fixes.  
MD

"DATABASE connection timeout"
Verify DATABASE_URL is set and references the PostgreSQL service  
MD

Check that PostgreSQL service is running in Railway Dashboard  
MD

Look for SSL connection errors in logs  
MD

"CORS error from frontend"
Update ALLOWED_ORIGINS on backend to include your frontend URL  
MD

Frontend URL must match exactly (including protocol and domain)  
MD

"Scheduler not running"
Scheduler starts automatically when backend starts  
MD

If service crashes/redeploys, scheduler restarts — this is normal  
MD

Check logs for [scheduler] Background jobs started

  
MD

"Migrations failed"
Set RUN_MIGRATIONS=true, redeploy, then watch logs  
MD

If stuck, manually run: railway shell → node migrate.js

  
MD

"App shows 5 credits but dashboard shows 0"
Expected before first sync: the Android app uses a local 5.0 placeholder until registration_ack / credit_update from the server.  
MD

After sync, server balance wins (new nodes default to 0 in the database).  
MD

Re-sync from Mesh → Railway Server Sync if the UI did not update.  
MD

"Post not in Feed after submit"
Posts stay pending until an operator Approves them in the dashboard Approval Queue.  
MD

After approve, the phone must sync to receive the post_approved outbound item.  
MD

Important Notes
SSL and DATABASE_URL
[cite: 1]
Railway's PostgreSQL requires SSL. The backend now includes:[cite: 1]

JavaScript
ssl: { rejectUnauthorized: false }
This is configured automatically when DATABASE_URL is detected. Local development can use individual connection variables without SSL.[cite: 1]

Scheduler Behavior
[cite: 1]
The scheduler (services/scheduler.js) runs inside the Node.js process:[cite: 1]

Expires tokens every 1 minute[cite: 1]

Checks for post expiry every 5 minutes[cite: 1]

Runs immediately on startup[cite: 1]

Restarts if the service restarts (harmless)[cite: 1]

For a true distributed scheduler with Railway's worker dynos, you'd need a separate architecture (e.g., Bull/Redis queue). For this use case, in-process scheduling is fine.[cite: 1]

Cost Considerations
[cite: 1]
PostgreSQL: Railway's free tier includes reasonable database limits[cite: 1]

Node.js backend: Sleeps after 7 days of inactivity on free tier (your scheduler will pause)[cite: 1]

Paid tier recommended for production token/credit system[cite: 1]

Rollback
[cite: 1]
To revert to a previous deployment:[cite: 1]

Bash
railway deployments
# Find the deployment ID
railway deploy --id <deployment-id>
Next Steps
[cite: 1]
  
MD
+ 4
Set up a custom domain (Railway supports this via Settings)[cite: 1]

Configure backups for PostgreSQL (via Railway Dashboard)[cite: 1]

Monitor logs regularly for errors[cite: 1]

Consider migrating to Railway's paid tier for production[cite: 1]