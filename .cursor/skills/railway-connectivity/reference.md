# Railway connectivity — manual curl reference

Replace `<backend>` and `<frontend>` with your Railway URLs.

## Backend

```bash
# Liveness (no DB)
curl -s https://<backend>/health | jq .

# Database connectivity
curl -s https://<backend>/api/health | jq .

# Stats (requires DB + migrations)
curl -s https://<backend>/api/stats | jq .
```

## Frontend (proxy)

```bash
# Frontend health (probes backend)
curl -s https://<frontend>/health | jq .

# API via proxy (same path the dashboard uses)
curl -s https://<frontend>/api/health | jq .
```

## Local dev

```bash
curl -s http://localhost:8080/health
curl -s http://localhost:8080/api/health
curl -s http://localhost:5173/health
curl -s http://localhost:5173/api/health
```

## Connectivity agent

```bash
BACKEND_URL=https://<backend> FRONTEND_URL=https://<frontend> npm run connectivity
```
