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

See **[MOBILE_AND_SYNC.md](./MOBILE_AND_SYN./MOBILE_AND_SYNC.md)** for credits (local 5.0 vs server 0), post approval → feed, and operator testing steps.

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

1. Go to [railway.app](https://railway.app)
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
```

**In Railway Dashboard for Backend Service:**
- Set Name: `meshboard-super-node` (SUPERNODE-ARUSHA-01)
- Root Directory: `Backend`
- Under Variables, add these after linking PostgreSQL:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `SUPERNODE_ID` | `SUPERNODE-ARUSHA-01` (or your node name) |
| `TOKEN_EXPIRY_HOURS` | `48` |
| `ALLOWED_ORIGINS` | Your dashboard URL, e.g. `https://your-frontend.up.railway.app` |
| `RUN_MIGRATIONS` | `false` (run `node migrate.js` via shell once; avoid `true` in production — it delays startup) |
| `DATABASE_URL` | `${{ DATABASE.URL }}` (reference variable from PostgreSQL service) |

### 3. Run Migrations (First Time Only)

After backend service starts:

```bash
# Via Railway CLI:
railway shell

# Inside the shell:
node migrate.js
exit
```

Or, set `RUN_MIGRATIONS=true` temporarily, deploy, then set back to `false`.

### 4. Seed Database (Optional)

```bash
railway shell
node seed.js
```

### 5. Deploy Frontend Service

1. Add a new Railway service linked to this repo
2. **Root Directory:** `Frontend`
3. Build/start commands: use `Frontend/railway.toml` (build via nixpacks, start `node serve.js`)

**Environment Variables for Frontend (set before build):**

| Variable            | Value |
|---------------------|-------|
| `VITE_API_BASE_URL` | `https://meshboard-super-node.up.railway.app/api` |
| `VITE_SUPERNODE_ID` | `SUPERNODE-ARUSHA-01` |

Redeploy/rebuild after changing `VITE_API_BASE_URL` — Vite bakes it into the bundle.

### 6. Update Backend CORS

Set backend `ALLOWED_ORIGINS` to your deployed frontend origin (exact URL, including `https://your-frontend.up.railway.app`:

```
ALLOWED_ORIGINS=https://your-frontend.up.railway.app
```

---

## Accessing the Deployment

- **Backend:** `https://meshboard-super-node.up.railway.app`
- **Health:** `https://meshboard-super-node.up.railway.app/health`
- **Frontend:** your frontend Railway URL (set `ALLOWED_ORIGINS` to match)

---

## Monitoring

### Logs

```bash
railway logs -s meshboard-super-node
railway logs -s <https://meshboard-frontend-production.up.railway.app/>
```

### Database

Railway PostgreSQL is accessible directly. To connect:

```bash
railway connect -s postgres
```

### Scheduler Status

The background scheduler is built into the backend service. Logs will show:

```
[scheduler] Background jobs started
[scheduler] Expired 0 token(s)
[scheduler] Queued expiry cleanup for 0 post(s)
```

---

## Troubleshooting

### "`buildCommand` and `startCommand` cannot be the same"

- **Backend** `startCommand` must be `node index.js` (not `npm start`).
- **Frontend** `buildCommand` = `npm run build`, `startCommand` = `node serve.js`.
- In Railway Dashboard → service → **Settings**, clear any custom **Build Command** / **Start Command** that both say `npm start` (UI overrides repo config).
- Remove duplicate `[start]` from `nixpacks.toml` — only `railway.toml` should define how the server starts.

### "Activity heartbeat timeout" / deploy keeps failing

1. **Root directory** — Each service must use its own folder:
   - Backend service → **Root Directory:** `Backend`
   - Frontend service → **Root Directory:** `Frontend`
2. **Health checks** — Both services expose `GET /health` (frontend and backend). Do not point healthcheck at `/api/...`.
3. **`RUN_MIGRATIONS`** — Keep `false` on Railway unless you are running a one-time migration. `true` used to block startup before the server listened.
4. **Frontend build** — `vite` is a devDependency. The Frontend `nixpacks.toml` runs `npm install --include=dev` then `npm run build`. If build logs show `vite: not found`, redeploy after pulling latest config.
5. **`DATABASE_URL`** — Backend must reference PostgreSQL: `${{https://railway.com/project/9cf3d8e8-6c52-4138-bac5-8051e5b0fffb/service/936d25fd-029f-461b-876a-98f3f7b5f7d9?environmentId=a414304f-ac09-400b-85ea-257c47293326&id=e92b9966-b432-46a3-bbc3-9b2c629f5807#deploy }}` or `${{ postgresql://postgres:IixyQgfBEFUETRIrrHJsVCEUwkqlJCTQ@postgres.railway.internal:5432/railway }}` (exact name depends on your linked service).
6. **Redeploy** both services after pushing these fixes.

### "DATABASE connection timeout"

- Verify `DATABASE_URL` is set and references the PostgreSQL service
- Check that PostgreSQL service is running in Railway Dashboard
- Look for SSL connection errors in logs

### "CORS error from frontend"

- Update `ALLOWED_ORIGINS` on backend to include your frontend URL
- Frontend URL must match exactly (including protocol and domain)

### "Scheduler not running"

- Scheduler starts automatically when backend starts
- If service crashes/redeploys, scheduler restarts — this is normal
- Check logs for `[scheduler] Background jobs started`

### "Migrations failed"

- Set `RUN_MIGRATIONS=true`, redeploy, then watch logs
- If stuck, manually run: `railway shell → node migrate.js`

### "App shows 5 credits but dashboard shows 0"

- Expected before first sync: the Android app uses a **local 5.0** placeholder until `registration_ack` / `credit_update` from the server.
- After sync, **server balance wins** (new nodes default to **0** in the database).
- Re-sync from **Mesh → Railway Server Sync** if the UI did not update.

### "Post not in Feed after submit"

- Posts stay **`pending`** until an operator **Approves** them in the dashboard **Approval Queue**.
- After approve, the phone must **sync** to receive the `post_approved` outbound item.

---

## Important Notes

### SSL and DATABASE_URL

Railway's PostgreSQL requires SSL. The backend now includes:

```javascript
ssl: { rejectUnauthorized: false }
```

This is configured automatically when `DATABASE_URL` is detected. Local development can use individual connection variables without SSL.

### Scheduler Behavior

The scheduler (`services/scheduler.js`) runs inside the Node.js process:
- Expires tokens every 1 minute
- Checks for post expiry every 5 minutes
- Runs immediately on startup
- Restarts if the service restarts (harmless)

For a true distributed scheduler with Railway's worker dynos, you'd need a separate architecture (e.g., Bull/Redis queue). For this use case, in-process scheduling is fine.

### Cost Considerations

- PostgreSQL: Railway's free tier includes reasonable database limits
- Node.js backend: Sleeps after 7 days of inactivity on free tier (your scheduler will pause)
- Paid tier recommended for production token/credit system

---

## Rollback

To revert to a previous deployment:

```bash
railway deployments
# Find the deployment ID
railway deploy --id <deployment-id>
```

---

## Next Steps

1. Set up a custom domain (Railway supports this via Settings)
2. Configure backups for PostgreSQL (via Railway Dashboard)
3. Monitor logs regularly for errors
4. Consider migrating to Railway's paid tier for production

