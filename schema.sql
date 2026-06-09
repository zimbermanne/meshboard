-- ==========================================
-- 1. USER TABLE 
-- (Note: "user" is a reserved keyword in Postgres, so it must have double quotes)
-- ==========================================
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    credit_balance INT DEFAULT 0,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. NODE TABLE (Hardware/Mesh hardware base)
-- ==========================================
CREATE TABLE IF NOT EXISTS node (
    id SERIAL PRIMARY KEY,
    hardware_id VARCHAR(100) UNIQUE NOT NULL,
    node_name VARCHAR(100),
    location_name VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. POST TABLE (Core message tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS post (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
    node_id INT REFERENCES node(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    credit_cost INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. FREE POST TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS free_post (
    id SERIAL PRIMARY KEY,
    post_id INT UNIQUE REFERENCES post(id) ON DELETE CASCADE,
    reason VARCHAR(100) DEFAULT 'welcome_bonus',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. TOKEN TABLE (For session authentication tokens)
-- ==========================================
CREATE TABLE IF NOT EXISTS token (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
    token_value VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(50) DEFAULT 'session',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. PAYMENTS TABLE (Top-ups and incoming balances)
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'TZS',
    provider VARCHAR(50) NOT NULL,              -- e.g., 'M-Pesa', 'Tigo Pesa', 'Stripe'
    reference_id VARCHAR(100) UNIQUE NOT NULL,  -- Payment gateway transaction ID
    status VARCHAR(20) DEFAULT 'pending',       -- 'pending', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. CREDIT TRANSACTIONS TABLE (Balance sheets)
-- ==========================================
CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(id) ON DELETE RESTRICT,
    payment_id INT REFERENCES payments(id) ON DELETE SET NULL,
    amount INT NOT NULL,                        -- Positive for balance added, negative for balance spent
    transaction_type VARCHAR(50) NOT NULL,       -- 'deposit', 'spend', 'refund'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 8. SYNC SESSION TABLE (Hardware connectivity tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS sync_session (
    id SERIAL PRIMARY KEY,
    node_id INT REFERENCES node(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- ==========================================
-- 9. SYNC QUEUE TABLE (Packets pending node sync)
-- ==========================================
CREATE TABLE IF NOT EXISTS sync_queue (
    id SERIAL PRIMARY KEY,
    sync_session_id INT REFERENCES sync_session(id) ON DELETE SET NULL,
    post_id INT REFERENCES post(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,                     -- Valid Postgres JSON binary data block
    status VARCHAR(20) DEFAULT 'queued',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
