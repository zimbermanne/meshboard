# MeshBoard Super-Node Backend

A production-ready Node.js backend for MeshBoard's super-node, providing REST APIs, token management, credit system, and an admin dashboard.

## Features

✅ **REST APIs** for client nodes:
- Node registration
- Broadcast request submission
- Active broadcast retrieval
- Credit balance queries
- Token generation and redemption

✅ **Operator Functions**:
- Post approval/rejection queue
- Credit deduction on approval
- Free monthly post tracking

✅ **Admin Dashboard**:
- Overview statistics (nodes, broadcasts, revenue, pending)
- Approval queue with approve/reject buttons
- Token generation and history
- Payment log with filtering
- Active broadcasts with countdown timers
- Node registry with detailed view
- JWT authentication

✅ **Database**: PostgreSQL with normalized schema for:
- Node registry
- Credit tracking
- Token lifecycle
- Payment history
- Broadcast messages
- Post requests

✅ **Deployment Ready**:
- Railway.app configuration
- Environment-based config
- Production-grade error handling

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Frontend**: Vanilla JS with responsive design

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/meshboard-supernode
cd meshboard-supernode
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/meshboard
JWT_SECRET=your-super-secret-key-min-32-chars-long
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose_a_strong_password
PORT=3000
NODE_ENV=development
```

### 3. Database Setup

The application auto-initializes the PostgreSQL database on first run. Ensure PostgreSQL is running:

```bash
# On macOS with Homebrew
brew services start postgresql

# On Linux
sudo systemctl start postgresql
```

Create the database:
```bash
createdb meshboard
```

### 4. Run Locally

```bash
npm run dev    # With auto-reload
# or
npm start      # Production mode
```

Server runs on `http://localhost:3000`
Dashboard: `http://localhost:3000/dashboard`

Login with credentials from `.env` (default: admin/admin123)

## API Endpoints

### Client Endpoints

#### `POST /api/register`
Register a new node in the network.

```json
{
  "node_id": "NODE-XXXX-XXXX",
  "display_name": "Mama Pima Boutique"
}
```

#### `POST /api/post-request`
Submit a broadcast request for approval.

```json
{
  "node_id": "NODE-XXXX-XXXX",
  "display_name": "Mama Pima Boutique",
  "message": "Buy 2 dresses, get 1 free! Text or visit",
  "link": "https://example.com",
  "phone": "+255123456789",
  "duration_days": 2,
  "is_free": false
}
```

#### `GET /api/broadcasts`
Fetch all active approved broadcasts.

Response includes broadcast count, duration, countdown info, etc.

#### `GET /api/credits/:nodeId`
Get credit balance for a specific node.

#### `POST /api/token/generate`
Operator generates a token (requires authorization).

```json
{
  "node_id": "NODE-XXXX-XXXX",
  "amount": 5.00,
  "operator": "admin"
}
```

Response includes generated token string to communicate to user.

#### `POST /api/token/redeem`
User redeems a token to add credits.

```json
{
  "token_id": "TXN-XXXX-XXXX-XXXX",
  "node_id": "NODE-XXXX-XXXX"
}
```

### Operator Endpoints

#### `POST /api/approve/:postId`
Operator approves a post request. Deducts credits or marks free post as used.

#### `POST /api/reject/:postId`
Operator rejects a post request.

```json
{
  "operatorId": "admin",
  "reason": "Inappropriate content"
}
```

### Admin Endpoints (Requires JWT)

All admin endpoints require `Authorization: Bearer <token>` header.

#### `POST /api/admin/login`
Authenticate and receive JWT token.

#### `GET /api/admin/dashboard`
Get overview stats (nodes, broadcasts, revenue, pending approvals).

#### `GET /api/admin/pending-posts`
List pending post requests awaiting approval.

#### `GET /api/admin/nodes?search=query`
List all registered nodes, optionally filtered by search.

#### `GET /api/admin/node/:nodeId`
Get detailed node information including token and payment history.

#### `GET /api/admin/tokens?status=pending&node_id=NODE-XXXX-XXXX`
List tokens with optional filtering.

#### `GET /api/admin/payments?method=cash&startDate=2024-01-01`
List payments with optional filtering.

#### `GET /api/admin/broadcasts`
List all active broadcasts with countdown info.

#### `POST /api/admin/broadcast/expire/:messageId`
Manually expire a broadcast for moderation.

## Deployment to Railway

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select this repository
4. Grant Railway access

### 3. Add PostgreSQL Plugin

In Railway dashboard:
1. Click "Add Service"
2. Select "PostgreSQL"
3. Railway automatically creates `DATABASE_URL` variable

### 4. Set Environment Variables

In Railway dashboard, add variables:
- `JWT_SECRET` - Strong random string (min 32 chars)
- `ADMIN_USERNAME` - Admin login username
- `ADMIN_PASSWORD` - Admin login password
- `NODE_ENV` - Set to `production`

### 5. Deploy

Railway auto-deploys on push. View logs in dashboard.

Your super-node will be available at: `https://your-project-name.railway.app`

## Database Schema

### nodes
- `id` (serial)
- `node_id` (unique) - NODE-XXXX-XXXX format
- `display_name` (varchar)
- `created_at` (timestamp)
- `credits` (decimal)
- `total_spent` (decimal)

### post_requests
- `id` (serial)
- `post_id` (unique) - Unique request ID
- `node_id` - FK to nodes
- `display_name` (varchar)
- `message` (text)
- `link`, `phone` (optional)
- `duration_days` (int)
- `cost` (decimal)
- `status` (pending/approved/rejected)
- `created_at`, `reviewed_at` (timestamps)
- `reviewed_by`, `rejection_reason` (optional)

### broadcasts
- `id` (serial)
- `message_id` (unique) - Unique message ID
- `node_id` - FK to nodes
- `message`, `link`, `phone`
- `duration_seconds` (int)
- `broadcast_timestamp` (timestamp)
- `is_active` (boolean)

### tokens
- `id` (serial)
- `token_id` (unique) - TXN-XXXX-XXXX-XXXX format
- `node_id` - FK to nodes
- `credit_amount` (decimal)
- `status` (pending/redeemed/expired)
- `created_at`, `expires_at` (timestamps)
- `redeemed_at` (optional)
- `created_by` (varchar)

### payments
- `id` (serial)
- `payment_id` (unique)
- `node_id` - FK to nodes
- `amount` (decimal)
- `method` (cash/mPesa)
- `operator` (varchar)
- `token_id` - FK to tokens
- `created_at` (timestamp)

### credits
- `id` (serial)
- `node_id` - FK to nodes
- `amount` (decimal)
- `balance_before`, `balance_after` (decimal)
- `created_at` (timestamp)

### free_posts
- `id` (serial)
- `node_id` - FK to nodes
- `used` (boolean)
- `month_year` (YYYY-MM)
- `created_at` (timestamp)

### admin_users
- `id` (serial)
- `username` (unique)
- `password_hash` (varchar)
- `created_at` (timestamp)

## Pricing

Standard pricing implemented:

| Duration | Price |
|----------|-------|
| 1 day    | $1.00 |
| 2 days   | $2.00 |
| 3 days   | $3.00 |
| 4 days   | $4.00 |
| 5 days   | $5.00 |
| 6 days   | $6.00 |
| 7 days   | $7.00 |

Free monthly post: 1 per user per calendar month, 2-day duration.

## Token System

### Token Lifecycle

1. **Generation**: Operator enters node ID + amount → generates unique token → communicates to user
2. **Expiry**: Token expires in 48 hours if unredeemed
3. **Redemption**: User enters token in client app → validated → credits added
4. **Security**: Single-use, tied to specific node ID, all history logged

### Token Format
`TXN-XXXX-XXXX-XXXX` (unique per generation)

## Admin Dashboard Features

### Overview Tab
- Real-time statistics
- Token generation form
- Quick token status

### Approval Queue
- Pending post requests
- Approve/reject with one click
- Message preview
- Cost calculation

### Tokens Tab
- Full token history
- Filter by status or node
- Track generation → redemption → expiry

### Payments Tab
- Payment log with filtering
- Revenue totals
- Payment method breakdown

### Broadcasts Tab
- Active broadcasts with countdown
- Manual expiry for moderation
- Time-remaining indicators

### Nodes Tab
- Searchable node registry
- View detailed node info
- Token & payment history per node

## Troubleshooting

### Database Connection Failed
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify database exists: `createdb meshboard`

### Password hash not working
- Ensure bcryptjs is installed: `npm install`

### JWT errors
- Change JWT_SECRET in .env
- Clear browser localStorage (contains old tokens)

### Port already in use
- Change PORT in .env
- Or: `lsof -i :3000` → `kill -9 <PID>`

## Security Notes

⚠️ **Development Only**:
- The default `.env.example` has weak credentials
- Change all defaults before production deployment

✅ **Production Checklist**:
- [ ] Change `JWT_SECRET` to strong random string (min 32 chars)
- [ ] Change `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- [ ] Use HTTPS only (Railway provides this)
- [ ] Set `NODE_ENV=production`
- [ ] Enable PostgreSQL backups (Railway handles this)
- [ ] Monitor logs regularly

## Next Phases

The specification includes additional phases not yet implemented:

- **Phase 2**: WiFi Direct sync layer
- **Phase 3**: Bluetooth Low Energy sync
- **Phase 4**: Gossip protocol for offline mesh
- **Phase 5**: M-Pesa Daraja API integration
- **Phase 6**: Analytics and reporting

## Support

For issues with the specification, refer to [meshboard_spec.md](./meshboard_spec.md).

For development help:
```bash
npm run dev      # Start with auto-reload
# Check logs for errors
```

## License

Proprietary - MeshBoard Project

---

**Status**: Production-ready for Phase 1 (Online mode with Railway deployment)

Last Updated: June 2024
