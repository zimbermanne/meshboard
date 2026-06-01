# MeshBoard Super-Node — API Reference

Quick reference for all REST API endpoints.

## Base URL
Development: `http://localhost:3000`
Production: `https://your-railway-project-name.railway.app`

---

## Client Endpoints (No Auth Required)

### 1. Register Node
**POST** `/api/register`

Register a new node in the network.

**Request:**
```json
{
  "node_id": "NODE-7X92-KM44",
  "display_name": "Mama Pima Boutique"
}
```

**Response (201):**
```json
{
  "message": "Node registered successfully",
  "node": {
    "id": 1,
    "node_id": "NODE-7X92-KM44",
    "display_name": "Mama Pima Boutique",
    "created_at": "2024-06-01T10:30:00Z",
    "credits": 0,
    "total_spent": 0
  }
}
```

---

### 2. Get Credit Balance
**GET** `/api/credits/:nodeId`

Get current credit balance for a node.

**URL Parameters:**
- `nodeId` - Node ID (NODE-XXXX-XXXX)

**Response (200):**
```json
{
  "node_id": "NODE-7X92-KM44",
  "credits": 5.50
}
```

---

### 3. Submit Post Request
**POST** `/api/post-request`

Submit a broadcast request for approval. User must have sufficient credits for paid posts.

**Request (Free Post):**
```json
{
  "node_id": "NODE-7X92-KM44",
  "display_name": "Mama Pima Boutique",
  "message": "Buy 2 dresses, get 1 free!",
  "duration_days": 2,
  "is_free": true
}
```

**Request (Paid Post):**
```json
{
  "node_id": "NODE-7X92-KM44",
  "display_name": "Mama Pima Boutique",
  "message": "Best quality fabrics in town",
  "link": "https://example.com",
  "phone": "+255123456789",
  "duration_days": 3,
  "is_free": false
}
```

**Response (201):**
```json
{
  "message": "Post request submitted",
  "post_request": {
    "id": 5,
    "post_id": "POST-1704067200000-AB1C2D",
    "node_id": "NODE-7X92-KM44",
    "display_name": "Mama Pima Boutique",
    "message": "Buy 2 dresses, get 1 free!",
    "link": null,
    "phone": null,
    "duration_days": 2,
    "cost": 0,
    "status": "pending",
    "created_at": "2024-06-01T10:30:00Z",
    "reviewed_at": null,
    "reviewed_by": null,
    "rejection_reason": null
  }
}
```

**Errors:**
- `400` - Missing required fields
- `402` - Insufficient credits
- `402` - Free monthly post already used
- `404` - Node not found

---

### 4. Get Active Broadcasts
**GET** `/api/broadcasts`

Fetch all active approved broadcasts currently in the network.

**Response (200):**
```json
{
  "broadcasts": [
    {
      "id": 1,
      "message_id": "MSG-7X92KM4400000000",
      "node_id": "NODE-7X92-KM44",
      "display_name": "Mama Pima Boutique",
      "message": "Buy 2 dresses, get 1 free!",
      "link": null,
      "phone": null,
      "duration_seconds": 172800,
      "broadcast_timestamp": "2024-06-01T10:30:00Z",
      "created_at": "2024-06-01T10:30:00Z",
      "is_active": true
    }
  ],
  "count": 1
}
```

---

### 5. Generate Token (Operator Action)
**POST** `/api/token/generate`

Operator generates a credit token. Token expires in 48 hours if not redeemed.

**Request:**
```json
{
  "node_id": "NODE-7X92-KM44",
  "amount": 10.00,
  "operator": "admin"
}
```

**Response (201):**
```json
{
  "message": "Token generated successfully",
  "token": {
    "id": 3,
    "token_id": "TXN-KM44-NODE-AB12",
    "node_id": "NODE-7X92-KM44",
    "credit_amount": "10.00",
    "status": "pending",
    "created_at": "2024-06-01T10:30:00Z",
    "expires_at": "2024-06-03T10:30:00Z",
    "redeemed_at": null,
    "created_by": "admin"
  },
  "token_string": "TXN-KM44-NODE-AB12"
}
```

**Note:** Communicate `token_string` to the user via SMS, phone call, or written note.

---

### 6. Redeem Token
**POST** `/api/token/redeem`

User redeems a token to add credits to their account.

**Request:**
```json
{
  "token_id": "TXN-KM44-NODE-AB12",
  "node_id": "NODE-7X92-KM44"
}
```

**Response (200):**
```json
{
  "message": "Token redeemed successfully",
  "credits_added": 10.00,
  "new_balance": 15.50
}
```

**Errors:**
- `404` - Token not found
- `403` - Token not tied to this node ID
- `400` - Token already redeemed/expired
- `400` - Token has expired (>48 hours)

---

## Operator Endpoints (No Auth Required)

### 7. Approve Post
**POST** `/api/approve/:postId`

Operator approves a pending post request. Deducts credits from user account and broadcasts the message.

**URL Parameters:**
- `postId` - Post request ID

**Request:**
```json
{
  "operatorId": "admin"
}
```

**Response (200):**
```json
{
  "message": "Post approved successfully",
  "message_id": "MSG-7X92KM4400000001",
  "broadcast": {
    "message_id": "MSG-7X92KM4400000001",
    "display_name": "Mama Pima Boutique",
    "message": "Buy 2 dresses, get 1 free!",
    "link": null,
    "phone": null,
    "duration_days": 2
  }
}
```

**Errors:**
- `404` - Post request not found
- `400` - Post already approved/rejected
- `402` - Insufficient credits

---

### 8. Reject Post
**POST** `/api/reject/:postId`

Operator rejects a pending post request. No credits are deducted.

**URL Parameters:**
- `postId` - Post request ID

**Request:**
```json
{
  "operatorId": "admin",
  "reason": "Inappropriate content"
}
```

**Response (200):**
```json
{
  "message": "Post rejected successfully",
  "post_id": "POST-1704067200000-AB1C2D"
}
```

---

## Admin Endpoints (JWT Required)

All admin endpoints require: `Authorization: Bearer <token>` header

### 9. Admin Login
**POST** `/api/admin/login`

Authenticate and receive JWT token for dashboard access.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin",
  "message": "Login successful"
}
```

**Token valid for:** 24 hours

---

### 10. Get Dashboard Stats
**GET** `/api/admin/dashboard`

Get overview statistics for the admin dashboard.

**Response (200):**
```json
{
  "stats": {
    "total_nodes": 42,
    "active_broadcasts": 7,
    "pending_approvals": 2,
    "monthly_revenue": 235.50,
    "last_sync": "2024-06-01T10:30:00Z"
  }
}
```

---

### 11. Get Pending Posts
**GET** `/api/admin/pending-posts`

Get all posts waiting for approval.

**Response (200):**
```json
{
  "posts": [
    {
      "id": 5,
      "post_id": "POST-1704067200000-AB1C2D",
      "node_id": "NODE-7X92-KM44",
      "display_name": "Mama Pima Boutique",
      "message": "Buy 2 dresses, get 1 free!",
      "link": null,
      "phone": null,
      "duration_days": 2,
      "cost": 0,
      "status": "pending",
      "created_at": "2024-06-01T10:30:00Z",
      "reviewed_at": null,
      "reviewed_by": null,
      "rejection_reason": null
    }
  ],
  "count": 1
}
```

---

### 12. Get Nodes (Searchable)
**GET** `/api/admin/nodes?search=query`

Get all registered nodes, optionally filtered by node ID or display name.

**Query Parameters:**
- `search` (optional) - Search by node ID or display name (case-insensitive)

**Response (200):**
```json
{
  "nodes": [
    {
      "id": 1,
      "node_id": "NODE-7X92-KM44",
      "display_name": "Mama Pima Boutique",
      "created_at": "2024-06-01T09:00:00Z",
      "credits": 5.50,
      "total_spent": 4.50
    }
  ],
  "count": 1
}
```

---

### 13. Get Node Details
**GET** `/api/admin/node/:nodeId`

Get detailed information about a specific node including token and payment history.

**URL Parameters:**
- `nodeId` - Node ID (NODE-XXXX-XXXX)

**Response (200):**
```json
{
  "node": {
    "id": 1,
    "node_id": "NODE-7X92-KM44",
    "display_name": "Mama Pima Boutique",
    "created_at": "2024-06-01T09:00:00Z",
    "credits": 5.50,
    "total_spent": 4.50
  },
  "tokens": [
    {
      "id": 3,
      "token_id": "TXN-KM44-NODE-AB12",
      "node_id": "NODE-7X92-KM44",
      "credit_amount": "10.00",
      "status": "redeemed",
      "created_at": "2024-06-01T10:30:00Z",
      "expires_at": "2024-06-03T10:30:00Z",
      "redeemed_at": "2024-06-01T10:45:00Z",
      "created_by": "admin"
    }
  ],
  "payments": [
    {
      "id": 2,
      "payment_id": "PAY-1704067200000-KM44AB",
      "node_id": "NODE-7X92-KM44",
      "amount": "10.00",
      "method": "cash",
      "operator": "admin",
      "token_id": "TXN-KM44-NODE-AB12",
      "created_at": "2024-06-01T10:30:00Z"
    }
  ],
  "recent_posts": [...]
}
```

---

### 14. Get Tokens
**GET** `/api/admin/tokens?status=pending&node_id=NODE-XXXX-XXXX`

Get all tokens with optional filtering.

**Query Parameters:**
- `status` (optional) - Filter by status: `pending`, `redeemed`, `expired`
- `node_id` (optional) - Filter by node ID

**Response (200):**
```json
{
  "tokens": [
    {
      "id": 3,
      "token_id": "TXN-KM44-NODE-AB12",
      "node_id": "NODE-7X92-KM44",
      "credit_amount": "10.00",
      "status": "pending",
      "created_at": "2024-06-01T10:30:00Z",
      "expires_at": "2024-06-03T10:30:00Z",
      "redeemed_at": null,
      "created_by": "admin"
    }
  ],
  "count": 1
}
```

---

### 15. Get Payments
**GET** `/api/admin/payments?method=cash&startDate=2024-06-01&endDate=2024-06-30`

Get payment history with optional filtering.

**Query Parameters:**
- `method` (optional) - Filter by method: `cash`, `mPesa`
- `startDate` (optional) - Filter from date (ISO format)
- `endDate` (optional) - Filter to date (ISO format)

**Response (200):**
```json
{
  "payments": [
    {
      "id": 2,
      "payment_id": "PAY-1704067200000-KM44AB",
      "node_id": "NODE-7X92-KM44",
      "display_name": "Mama Pima Boutique",
      "amount": "10.00",
      "method": "cash",
      "operator": "admin",
      "token_id": "TXN-KM44-NODE-AB12",
      "created_at": "2024-06-01T10:30:00Z"
    }
  ],
  "count": 1,
  "total_revenue": 235.50
}
```

---

### 16. Get Broadcasts
**GET** `/api/admin/broadcasts`

Get all active broadcasts with countdown information.

**Response (200):**
```json
{
  "broadcasts": [
    {
      "id": 1,
      "message_id": "MSG-7X92KM4400000001",
      "node_id": "NODE-7X92-KM44",
      "display_name": "Mama Pima Boutique",
      "message": "Buy 2 dresses, get 1 free!",
      "link": null,
      "phone": null,
      "duration_seconds": 172800,
      "broadcast_timestamp": "2024-06-01T10:30:00Z",
      "created_at": "2024-06-01T10:30:00Z",
      "is_active": true,
      "expires_at": "2024-06-03T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

### 17. Expire Broadcast (Moderation)
**POST** `/api/admin/broadcast/expire/:messageId`

Manually expire a broadcast for moderation purposes.

**URL Parameters:**
- `messageId` - Message ID

**Response (200):**
```json
{
  "message": "Broadcast expired",
  "broadcast": {
    "id": 1,
    "message_id": "MSG-7X92KM4400000001",
    "node_id": "NODE-7X92-KM44",
    "display_name": "Mama Pima Boutique",
    "message": "Buy 2 dresses, get 1 free!",
    "link": null,
    "phone": null,
    "duration_seconds": 172800,
    "broadcast_timestamp": "2024-06-01T10:30:00Z",
    "created_at": "2024-06-01T10:30:00Z",
    "is_active": false
  }
}
```

---

## Health Check

### 18. Server Health
**GET** `/health`

Check if the server is running.

**Response (200):**
```json
{
  "status": "ok",
  "message": "MeshBoard super-node is running"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200` - OK
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (token required)
- `402` - Payment Required (insufficient credits)
- `403` - Forbidden (token not tied to node)
- `404` - Not Found
- `500` - Server Error

---

## Testing with Postman

Import this collection into Postman for easy testing:

1. Create environment variables:
   - `base_url` = `http://localhost:3000`
   - `token` = (will be set after login)
   - `node_id` = (your test node ID)

2. Create requests in this order:
   - POST Register Node
   - GET Credit Balance
   - POST Submit Post Request (free)
   - GET Active Broadcasts
   - POST Admin Login (save token)
   - GET Dashboard Stats
   - GET Pending Posts
   - POST Approve Post
   - GET Active Broadcasts (verify)

---

## Pricing Reference

| Duration | Price |
|----------|-------|
| Free (monthly) | 2 days (1 per month) |
| 1 day | $1.00 |
| 2 days | $2.00 |
| 3 days | $3.00 |
| 4 days | $4.00 |
| 5 days | $5.00 |
| 6 days | $6.00 |
| 7 days | $7.00 |

---

## Example Workflow

### 1. New User Registration
```bash
POST /api/register
→ Get unique NODE-XXXX-XXXX ID
```

### 2. User Adds Credits (via operator)
```bash
POST /api/token/generate
← Get token string
# Operator communicates token to user
```

### 3. User Redeems Token
```bash
POST /api/token/redeem
→ Credits added to account
```

### 4. User Posts Broadcast
```bash
POST /api/post-request
→ Submitted for approval
```

### 5. Operator Reviews & Approves
```bash
GET /api/admin/pending-posts
POST /api/approve/:postId
→ Message goes live
```

### 6. Other Users See Broadcast
```bash
GET /api/broadcasts
→ See message with countdown
```

### 7. Message Expires
```
After duration_seconds, message auto-expires on all devices
```

---

Last Updated: June 2024
