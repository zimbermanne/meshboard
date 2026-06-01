# MeshBoard Super-Node — Quick Setup Guide

## 30-Second Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Create .env File
```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection URL:
```
DATABASE_URL=postgresql://user:password@localhost:5432/meshboard
JWT_SECRET=your-secret-key-change-this
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
PORT=3000
```

### Step 3: Start Server
```bash
npm start
```

Server runs on: **http://localhost:3000**

Dashboard: **http://localhost:3000/dashboard**

### Step 4: Login to Dashboard
Username: `admin`  
Password: `admin123`

---

## API Testing with cURL

### Register a node
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "NODE-7X92-KM44",
    "display_name": "Mama Pima Boutique"
  }'
```

### Get credit balance
```bash
curl http://localhost:3000/api/credits/NODE-7X92-KM44
```

### Submit a post request (free)
```bash
curl -X POST http://localhost:3000/api/post-request \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "NODE-7X92-KM44",
    "display_name": "Mama Pima Boutique",
    "message": "Buy 2 get 1 free!",
    "duration_days": 2,
    "is_free": true
  }'
```

### Submit a paid post request
```bash
curl -X POST http://localhost:3000/api/post-request \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "NODE-7X92-KM44",
    "display_name": "Mama Pima Boutique",
    "message": "Buy 2 get 1 free!",
    "link": "https://example.com",
    "phone": "+255123456789",
    "duration_days": 3,
    "is_free": false
  }'
```

### Get active broadcasts
```bash
curl http://localhost:3000/api/broadcasts
```

### Admin Login
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Save the returned `token` for subsequent admin requests.

### Get dashboard data (requires token)
```bash
curl http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Key Database Operations

Once you login to the dashboard, you can:

1. **View pending posts** - See all posts awaiting approval
2. **Approve posts** - Deducts credits, broadcasts the message
3. **Reject posts** - Denies the post request
4. **Generate tokens** - Create redemption tokens for users to claim credits
5. **View payment history** - Track all payments and revenue
6. **Monitor broadcasts** - See active messages with countdown timers
7. **Manage nodes** - Search and view detailed node information

---

## Deployment to Railway

### One-Click Deploy

1. Push to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → Select your GitHub repo
4. Add PostgreSQL plugin
5. Set environment variables (JWT_SECRET, ADMIN_USERNAME, etc.)
6. Deploy!

Railway auto-detects Node.js and uses `railway.json` config.

---

## Project Structure

```
meshboard-supernode/
├── server.js              # Main Express app
├── db.js                  # Database initialization & pool
├── utils.js               # Utility functions (ID generation, JWT, etc)
├── routes/
│   ├── client.js          # Client API endpoints
│   ├── operator.js        # Operator approval endpoints
│   ├── auth.js            # Admin authentication
│   └── admin.js           # Admin dashboard API
├── public/
│   └── index.html         # Admin dashboard (single-page app)
├── package.json           # Dependencies
├── railway.json           # Railway deployment config
├── .env.example           # Environment template
├── README.md              # Full documentation
└── SETUP.md               # This file
```

---

## Common Tasks

### Check if server is running
```bash
curl http://localhost:3000/health
```

### View server logs in development
```bash
npm run dev
# Server logs to console automatically
```

### Add a new admin user (future feature)
Currently, credentials are read from `.env`.
Database schema supports `admin_users` table for future multi-admin support.

### Reset all data
⚠️ Warning: This deletes everything!
```bash
psql meshboard
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then restart the server to reinitialize
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" | Check PostgreSQL is running: `psql meshboard` |
| "Database does not exist" | Create it: `createdb meshboard` |
| "Port 3000 already in use" | Change PORT in .env or kill process: `lsof -i :3000` |
| "JWT invalid" | Clear browser localStorage and re-login |
| "Authentication failed" | Check ADMIN_USERNAME and ADMIN_PASSWORD in .env |

---

## What's Implemented (Phase 1)

✅ Complete REST API for clients  
✅ Token generation and redemption  
✅ Post approval/rejection queue  
✅ Credit balance system  
✅ Admin dashboard with all features  
✅ PostgreSQL database with full schema  
✅ JWT authentication  
✅ Railway deployment config  

Not yet implemented (Phase 2+):  
⏳ WiFi Direct sync  
⏳ Bluetooth sync  
⏳ Gossip protocol mesh  
⏳ M-Pesa API integration  

---

## Questions?

See [README.md](./README.md) for comprehensive documentation.

See [meshboard_spec.md](./meshboard_spec.md) for the product specification.
