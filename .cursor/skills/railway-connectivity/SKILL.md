---
name: railway-connectivity
description: >-
  Deploy MeshBoard super-node to Railway and verify Backend→PostgreSQL and
  Frontend→Backend connectivity. Use when deploying to Railway, fixing connection
  errors, Postgres issues, frontend proxy/CORS problems, or running connectivity checks.
---

# Railway Connectivity (MeshBoard Super-Node)

## Architecture

Two Railway services plus linked PostgreSQL:

```text
[Frontend serve.js] --proxy /api--> [Backend Express] --> [PostgreSQL]
```

- **Backend** — [`Backend/index.js`](Backend/index.js), entry `node index.js`, health `GET /health`, DB check `GET /api/health`
- **Frontend** — [`Frontend/serve.js`](Frontend/serve.js), proxies `/api/*` to `BACKEND_URL`
- **PostgreSQL** — linked to Backend; `DATABASE_URL` auto-injected on Railway

## Environment matrix

### Backend service ([`Backend/railway.toml`](Backend/railway.toml))

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Optional | May contain placeholder host `base` — backend uses `PGHOST` when Postgres is linked |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Yes | Injected when PostgreSQL plugin is linked to Backend |
| `ALLOWED_ORIGINS` | Yes (prod) | Frontend Railway URL, comma-separated |
| `SUPERNODE_ID` | Optional | Shown in health responses |
| `RUN_MIGRATIONS` | First deploy | Set `true` once, or run `npm run migrate` in Railway shell |
| `NODE_ENV` | Recommended | `production` |

### Frontend service ([`Frontend/railway.toml`](Frontend/railway.toml))

| Variable | Required | Notes |
|----------|----------|-------|
| `BACKEND_URL` | Yes | Backend public URL **without** `/api` suffix |
| `PORT` | Auto | Railway sets this |

Do **not** set `VITE_API_BASE_URL` unless you need a direct cross-origin API URL. Default `/api` + proxy is preferred ([`Frontend/src/api/client.js`](Frontend/src/api/client.js)).

## Run the connectivity agent

From repo root:

```bash
# Production (set your Railway URLs)
BACKEND_URL=https://meshboard-super-node.up.railway.app \
FRONTEND_URL=https://your-frontend.up.railway.app \
npm run connectivity

# Local (backend :4000, frontend :3000)
npm run connectivity:local
```

Optional direct DB probe (Backend shell or local with `DATABASE_URL` set):

```bash
DATABASE_URL=postgresql://... npm run connectivity
```

Script: [`scripts/connectivity-agent.js`](scripts/connectivity-agent.js)

### Interpreting results

| Check | PASS means | Common failure |
|-------|------------|----------------|
| Backend liveness | API process up | Wrong URL, service crashed |
| Backend → PostgreSQL | `GET /api/health` → `database: connected` | PG not linked, bad `DATABASE_URL`, migrations not run |
| Frontend liveness | `GET /health` → `status: ok` | Build failed (`dist` missing), backend unreachable |
| Frontend → Backend (proxy) | `GET /api/health` via frontend → DB connected | Wrong `BACKEND_URL`, trailing `/api` on `BACKEND_URL` |

Exit code `0` = all checks passed; `1` = at least one failed.

## Troubleshooting playbook

Maps to [`Frontend/src/components/StatusBanner.jsx`](Frontend/src/components/StatusBanner.jsx):

### "Database not connected" (`database: disconnected`)

1. Railway Backend → Variables → confirm `DATABASE_URL` exists (link PostgreSQL service).
2. Run migrations: `cd Backend && npm run migrate` in Railway shell, or `RUN_MIGRATIONS=true` once.
3. Curl: `curl https://<backend>/api/health`

### "Cannot reach backend API"

1. Frontend service → set `BACKEND_URL` to backend public URL (no `/api`).
2. Confirm backend is up: `curl https://<backend>/health`
3. Local dev: `cd Backend && npm start` (port 4000), then `cd Frontend && npm run dev`

### CORS errors in browser

Set `ALLOWED_ORIGINS` on Backend to the exact frontend origin (scheme + host, no trailing slash).

### Frontend Railway healthcheck failing

`GET /health` on Frontend now probes backend. If `BACKEND_URL` is wrong, Frontend returns `503` / `degraded`. Fix `BACKEND_URL` first.

## Mobile client (external repo)

The Android app is **not** in this repository. It depends on a healthy backend:

- `GET /health` — liveness
- `POST /api/sync` — mesh sync

Before testing mobile, ensure `GET /api/health` returns `database: connected`. See [`MOBILE_AND_SYNC.md`](MOBILE_AND_SYNC.md) for the operator checklist.

## Post-deploy checklist

1. Link PostgreSQL to Backend on Railway (reference `PGHOST` + credentials on Backend service).
2. Deploy backend — `DATABASE_URL` with host `base` is OK if `PGHOST` is set.
3. `POST https://meshboard-super-node.up.railway.app/api/setup/migrate` or `RUN_MIGRATIONS=true`.
4. Set `ALLOWED_ORIGINS` on Backend to Frontend URL.
5. Set `BACKEND_URL=https://meshboard-super-node.up.railway.app` on Frontend.
6. `npm run connectivity` with production URLs.
6. Open dashboard — StatusBanner should not show connection errors.

## Manual curl debugging

See [reference.md](reference.md) for copy-paste curl commands.
