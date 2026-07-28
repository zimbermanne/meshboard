# MeshBoard (Ubaoni)

A town-scoped local classifieds web app — housing, jobs, small business
listings, and services, posted directly by the community so people don't
have to go through agents who can be corrupt or extractive. Designed to
work in any town or city, not tied to one country or region.

This README captures the product thinking, architecture decisions, and
changes made during development so far, in one place.

---

## 1. The Problem & Core Idea

Local agents (housing brokers, informal middlemen) sometimes extract rent
for information — vacant housing, jobs, local business listings — that
should be freely available to the community. MeshBoard's goal is to let
people **post local information directly**, bypassing that gatekeeping,
while staying trustworthy enough that people actually rely on it over
existing WhatsApp/Facebook groups.

### Design decisions made (and why)

| Decision | Reasoning |
|---|---|
| **Town-scoped feeds** (Arusha ≠ Moshi) | Region-wide loses the "local trust" signal; neighborhood-level is too small to reach critical mass. Town is the right trust boundary. |
| **3-day auto-expiring listings** | Forces freshness, kills zombie posts, creates urgency — better than an unmoderated WhatsApp group that never clears out. |
| **First post free, payment gates renewal/extra posts** | Avoids the cold-start problem (nobody pays to post into an empty marketplace) while still using the existing credit/Baosh/M-Pesa rail for monetization once there's real usage. |

### Open product questions (not yet decided)
- Should listings be split into **time-bound** (jobs, rooms — expire in 3
  days) vs. **standing business profiles** (a tailor, a shop — shouldn't
  expire)? Flagged by the council as a real gap; not yet built.
- Moderation model long-term: currently a single-approver queue
  (`status: pending → approved`). The council flagged that a single
  approver can recreate the "corrupt middleman" problem at smaller scale —
  community-vouching or open+flagging models were discussed as
  alternatives but not implemented.
- Town list is currently a hardcoded dropdown (Arusha, Moshi, Karatu,
  Same, Mwanga) as a starter example for the pilot — not a geographic
  constraint. Should become dynamic/configurable to support any town.
- **Structured fields for housing listings** (proposed, not built): instead
  of a free-text post for housing specifically, capture ward/street, house
  type, bedrooms, monthly rent, water/electricity availability, parking,
  and distance from the main road as discrete fields. Cheaper to run than
  photo uploads, easier to search/filter, and harder to fake convincingly
  than a stolen stock photo. This would apply to the housing category only
  — the app stays multi-category (jobs, services, small business remain
  free-text as they are today).

---

## 2. Architecture (what's actually real)

The repo previously contained **two backends**: a working Node/Express API
and a dead, unwired FastAPI mock (`main.py`, `model.py`, `database.py`,
`init_db.py`) that returned hardcoded fake data and was never actually
run. The dead stack — plus a stale `schema.sql` that didn't match the real
schema — has been **deleted**. The real, live system is:

- **Backend**: Node.js / Express (`Backend/index.js` + `Backend/routes/*.js`)
- **Database**: Postgres, schema defined in `Backend/migrate.js` (this file
  is the source of truth — there is no separate schema.sql anymore)
- **Frontend**: React (Vite), pages in `Frontend/src/pages/`
- **Auth**: JWT (7-day expiry) + bcrypt, role-based (`user` / `admin`)
- **Payments/credits**: "Baosh" token system, M-Pesa-oriented, tied to each
  account's auto-provisioned node
- **Background job**: `Backend/services/scheduler.js` runs every 5 minutes,
  expires posts past their `expires_at` and queues mesh cleanup broadcasts

---

## 3. Changes made this project (chronological)

1. **Security cleanup**
   - `.env` and `Backend/.env` were tracked in git history with real DB
     credentials — untracked going forward (`.gitignore` already had the
     right rules, they just hadn't been applied to already-tracked files).
     **The DB password still needs to be rotated in Railway** — untracking
     a file doesn't erase it from git history or from anyone who already
     saw it.
   - Found and flagged: `middleware/auth.js` falls back to a hardcoded JWT
     secret if `JWT_SECRET` isn't set in the environment — if that env var
     is missing in production, tokens (including admin) can be forged.
     **Needs verifying on Railway.**
   - No rate-limiting on `/api/auth/login` — currently unmitigated against
     brute force / credential stuffing. Not yet fixed.

2. **Dead code removal**
   - Deleted the unused FastAPI stack (`main.py`, `model.py`,
     `database.py`, `init_db.py`, `requirements.txt`) and the stale,
     out-of-sync `schema.sql`. These were never wired to the real app and
     were making the codebase look far more broken than it was.

3. **Town-scoping**
   - Added `town` column to `posts` and `dashboard_users` (via
     `migrate.js`, additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
   - `POST /api/auth/register` now requires `town`.
   - `PATCH /api/auth/profile` can set/update `town` for existing accounts.
   - `POST /api/posts` stamps the poster's town onto the new post.
   - `GET /api/posts/active` filters by the requester's own town by
     default (admins can pass `?town=all` or `?town=<name>` to inspect
     others).
   - Frontend: `Register.jsx` and `UserProfile.jsx` got a town dropdown.

4. **Automatic node provisioning**
   - New `Backend/utils/nodeProvision.js` — generates a unique
     `NODE-XXXX-XXXX` id and creates the row in `nodes` automatically.
   - `POST /api/auth/register` auto-provisions a node and links it, no
     manual entry required.
   - `POST /api/auth/login` auto-provisions a node as a safety net for any
     account created before this change (`node_id` was `NULL`).
   - `POST /api/posts` no longer hard-blocks on a missing node link (should
     be unreachable now, but fails safely with a clear message if it ever
     happens).
   - Frontend: node ID fields in `Register.jsx` / `UserProfile.jsx` are now
     framed as optional, for real mesh-hardware owners only. `SubmitPost.jsx`
     no longer surfaces the internal node id to users at all. Profile save
     can no longer accidentally clear a linked node to `null`.

5. **"Submit for Approval" bug fix**
   - `POST /api/posts`'s handler had several `await` database calls
     **outside any try/catch**. In Express 4, an unguarded throw in an
     async handler means no response is ever sent — the request just
     hangs, which looks like a stuck "Submitting…" button on the frontend.
   - Root cause was very likely the `town` column not existing yet on the
     live database (if the migration hadn't been run), which would throw
     exactly this kind of unguarded error.
   - Fixed: the entire handler is now wrapped in one try/catch, so any
     failure returns a proper JSON error instead of hanging.

6. **JWT secret hardening + login rate-limiting**
   - `middleware/auth.js` no longer silently falls back to a hardcoded
     secret. In production, the app now **refuses to start** if
     `JWT_SECRET` isn't set (verified: throws on boot). In development it
     still works but prints a loud warning.
   - Added `express-rate-limit` — 10 login attempts per 15 minutes and 20
     registrations per hour, per IP, to blunt brute-force/credential
     stuffing and scripted mass account creation.

---

## 4. Known open items / next steps

- [ ] **Rotate the Railway Postgres password** (was in git history)
- [x] **Confirm `JWT_SECRET` is set** in Railway's environment variables —
      the app now refuses to boot in production without it, so this is
      self-enforcing going forward. Still confirm it's actually set before
      this deploys, or the backend won't start at all.
- [ ] **Confirm the `town` migration has actually run** against the live
      DB — check `GET /api/health` reports `"database": "connected"`,
      then verify a real registration succeeds end-to-end
- [x] Add rate-limiting to `/api/auth/login` (and `/register`)
- [ ] Decide & build: standing "business profile" listings that don't
      expire, vs. time-bound listings that do
- [ ] Decide on longer-term moderation model beyond single-approver queue
- [ ] Password reset flow — not confirmed to exist yet, worth checking
- [ ] JWT token revocation — currently no way to invalidate a token before
      its 7-day expiry (e.g. lost device, compromised account)
- [ ] **Proposed, not built**: temporary account lockout after repeated
      failed logins (pairs with the rate-limiting item above)
- [ ] **Proposed, not built**: phone number verification (OTP) before a
      new account can post — doubles as spam control and an identity/
      accountability signal, but adds an SMS provider cost/dependency, so
      deliberately deferred until there's real usage in a specific town
- [ ] **Proposed, not built**: structured housing-listing fields (see
      section 1) instead of free-text-only posts for the housing category

---

## 5. Local setup

```bash
# Backend
cd Backend
npm install
cp .env.example .env   # fill in real DB credentials, JWT_SECRET, etc.
npm run migrate        # applies schema from migrate.js
npm start

# Frontend
cd Frontend
npm install
npm run dev
```

Never commit `.env` files — `.gitignore` already excludes them.
