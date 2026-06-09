# Mobile app ↔ Super-node sync

How the Android client and `https://meshboard-super-node.up.railway.app` stay in sync with the web dashboard.

---

## Prerequisites (backend must be healthy)

Mobile sync depends on a working backend and PostgreSQL connection. Before testing the Android app:

1. `GET /api/health` on the backend must return `"database": "connected"`.
2. After Railway deploy, run from the repo root:
   ```bash
   BACKEND_URL=https://meshboard-super-node.up.railway.app npm run connectivity
   ```
   Or curl: `curl https://meshboard-super-node.up.railway.app/api/health`
3. For Railway deploy and connection troubleshooting, use the project skill: `.cursor/skills/railway-connectivity/SKILL.md`

---

## URLs

| Client | Base URL |
|--------|----------|
| **Android** | `https://meshboard-super-node.up.railway.app` (no `/api` — Retrofit adds `api/sync`, `api/posts`, etc.) |
| **Web dashboard** | Set `BACKEND_URL=https://meshboard-super-node.up.railway.app` on the Frontend Railway service (proxy `/api`). Do not use placeholder values like `base`. |

---

## Credits: local 5.0 vs server 0

| When | Balance shown in app |
|------|----------------------|
| Before first successful sync | **5.0** (local default only — not on server) |
| After registration / first sync | **Server value** (new nodes are created with **`credit_balance = 0`** in PostgreSQL) |
| After token redeem or operator top-up | Server balance; app updates on next `credit_update` outbound item |

**Server is source of truth.** The super-node never seeds welcome credits. `registration_ack` and `credit_update` sync payloads include the real `credit_balance` from the `nodes` table.

**Implications for testing**

- A user with **0 server credits** cannot get a **paid** post approved (operator approve returns `402 Insufficient credits`).
- Use a **free post** (first 2-day package in a calendar month) or **generate + redeem a token** in the dashboard before approving a paid post.
- After first sync, if the app still shows 5.0, trigger **Mesh → Railway Server Sync** again or check that `registration_ack` / `credit_update` outbound items are processed.

---

## Post → Feed flow

1. **Mobile** submits a post (`POST /api/posts` or sync item `post_request`).
2. Post is stored as **`pending`** — visible in dashboard **Approval Queue**, not in the public feed yet.
3. **Operator** opens the dashboard → **Approval Queue** → **Approve** (or **Reject**).
4. On approve, the server:
   - Sets post `status = approved` and `expires_at`
   - Deducts credits if applicable
   - Enqueues **`post_approved`** (broadcast to all nodes) and **`credit_update`** (to the author)
5. **Mobile** runs sync (`POST /api/sync`). Outbound queue delivers `post_approved` → app shows the post in **Feed**.

> **Testing:** Submit a post from the app, approve it in the super-node dashboard, then sync on the device. The feed will not update until both approve **and** sync complete.

---

## Sync protocol (summary)

**Request:** `POST /api/sync`

```json
{
  "node_id": "NODE-XXXX-YYYY",
  "transport": "internet",
  "items": [ { "type": "registration", "data": { "id": "...", "display_name": "..." } } ]
}
```

**Response outbound types the app should handle**

| Type | Meaning |
|------|---------|
| `registration_ack` | Registered; includes `credit_balance` (usually `0` for new users) |
| `credit_update` | Balance changed (token redeem, post charge, etc.) |
| `post_approved` | Approved broadcast — add to feed |
| `expiry_cleanup` | Remove expired post IDs from feed |
| `node_deactivated` / `node_reactivated` | Operator blocked or restored the node |

---

## Operator checklist (new device test)

1. Install app → confirm Railway URL is `https://meshboard-super-node.up.railway.app`.
2. Register / sync once → app balance should drop from **5.0** to **0.0** (server truth).
3. Submit a test post from the app.
4. Dashboard → **Approval Queue** → **Approve** (use free 2-day post or add credits via **Tokens** first).
5. App → **Mesh → Railway Server Sync** (or wait for automatic sync).
6. Confirm post appears in **Feed**.

---

## Dashboard links

- Health: `https://meshboard-super-node.up.railway.app/health`
- Pending posts: dashboard **Approval Queue**
- Live broadcasts: **Live Broadcasts** (approved + not expired)
