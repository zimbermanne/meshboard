# MeshBoard Super-Node — Railway Deployment Guide

## Overview

The MeshBoard Super-Node consists of two services that deploy separately to Railway:
1. **Backend** — Node.js/Express API server
2. **Frontend** — React/Vite web dashboard

Both services are in this repository but deploy independently.

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
- Set Name: `meshboard-backend`
- Under Variables, add these after linking PostgreSQL:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `SUPERNODE_ID` | `SUPERNODE-ARUSHA-01` (or your node name) |
| `TOKEN_EXPIRY_HOURS` | `48` |
| `ALLOWED_ORIGINS` | `https://meshboard-frontend.up.railway.app` (update after frontend deploy) |
| `RUN_MIGRATIONS` | `false` (set to `true` on first deploy, then back to `false`) |
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

The frontend is separate. Create a new Railway service:

1. In Railway Dashboard, add a new service
2. Build command: `npm run build`
3. Start command: `npm run preview`
4. Root directory: `.` (if frontend code is in root) or `./frontend` if in a subfolder

**Environment Variables for Frontend:**

| Variable            | Value                                          |
|---------------------|------------------------------------------------|
| `VITE_API_BASE_URL` | `https://meshboard-backend.up.railway.app/api` |
| `VITE_SUPERNODE_ID` | `SUPERNODE-ARUSHA-01`                          |

(Replace `meshboard-backend.up.railway.app` with your actual backend service URL from Railway Dashboard)

### 6. Update Backend CORS

Now that frontend is deployed, update the backend's `ALLOWED_ORIGINS` to include the actual frontend URL:

```
ALLOWED_ORIGINS=https://meshboard-frontend.up.railway.app,https://your-custom-domain.com
```

---

## Accessing the Deployment

- **Frontend:** `https://meshboard-frontend.up.railway.app`
- **Backend:** `https://meshboard-backend.up.railway.app`
- **Health Check:** `https://meshboard-backend.up.railway.app/health`

---

## Monitoring

### Logs

```bash
railway logs -s meshboard-backend
railway logs -s meshboard-frontend
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

