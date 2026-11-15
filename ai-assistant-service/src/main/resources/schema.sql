-- CineMind Relational Schema
CREATE TABLE IF NOT EXISTS concession_items (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    calories INT NOT NULL DEFAULT 0,
    icon VARCHAR(32) NOT NULL DEFAULT '🍿',
    dietary_tags_csv VARCHAR(255),
    genre_pairings_csv VARCHAR(255),
    description TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS concession_orders (
    order_id VARCHAR(64) PRIMARY KEY,
    items_json TEXT,
    delivery_seat VARCHAR(255),
    total_amount DOUBLE PRECISION,
    status VARCHAR(64),
    estimated_minutes INT,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
    ticket_id VARCHAR(64) PRIMARY KEY,
    movie_title VARCHAR(255),
    show_time VARCHAR(64),
    format VARCHAR(64),
    auditorium VARCHAR(255),
    seats_csv VARCHAR(255),
    total_paid DOUBLE PRECISION,
    qr_payload TEXT,
    signature VARCHAR(255),
    status VARCHAR(64),
    issued_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movies (
    id BIGINT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    rating DOUBLE PRECISION,
    year INT,
    release_date VARCHAR(64),
    duration VARCHAR(64),
    price DOUBLE PRECISION,
    ai_pick BOOLEAN,
    synopsis TEXT,
    suggested_seats_csv VARCHAR(255),
    poster_url TEXT,
    auditorium VARCHAR(255),
    status VARCHAR(64),
    occupancy_rate INT,
    showtimes VARCHAR(255),
    rotten_tomatoes INT,
    metacritic INT,
    imdb_rating DOUBLE PRECISION,
    critic_consensus TEXT,
    top_critic_quote TEXT,
    reviews_count INT,
    trailer_url TEXT,
    director VARCHAR(255),
    cast_members TEXT,
    age_rating VARCHAR(64)
);

-- Distributed Fintech Wallets & Immutable Double-Entry Ledger
CREATE TABLE IF NOT EXISTS wallets (
    wallet_id VARCHAR(64) PRIMARY KEY,
    currency VARCHAR(16) NOT NULL DEFAULT 'USD',
    balance DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    wallet_id VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    balance_after DOUBLE PRECISION NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Distributed Squad & Bill Splitting Schema
-- Role-Based Access Control (RBAC) User Personas (PostgreSQL SSOT)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL DEFAULT '$2a$10$nb893xmrMDBoH8VRVIEr1Olwal7qhPjXZZFn1vYI1DOINoBWZ4ruK',
    role VARCHAR(64) NOT NULL,
    role_display_name VARCHAR(128),
    membership_tier VARCHAR(128),
    discount_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    avatar_url TEXT,
    permissions_csv TEXT,
    is_authenticated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT '$2a$10$nb893xmrMDBoH8VRVIEr1Olwal7qhPjXZZFn1vYI1DOINoBWZ4ruK';
UPDATE user_profiles SET password_hash = '$2a$10$nb893xmrMDBoH8VRVIEr1Olwal7qhPjXZZFn1vYI1DOINoBWZ4ruK' WHERE password_hash IS NULL;

-- Initial Database Seeding via DDL/DML Migration
INSERT INTO user_profiles (user_id, full_name, email, password_hash, role, role_display_name, membership_tier, discount_rate, avatar_url, permissions_csv, is_authenticated)
VALUES
('usr-vip-001', 'Alex Vance', 'alex.vance@cinemind.vip', '$2a$10$nb893xmrMDBoH8VRVIEr1Olwal7qhPjXZZFn1vYI1DOINoBWZ4ruK', 'VIP_PATRON', 'Gold Lounge VIP Member', 'CineMind Founder Gold', 0.20, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop', 'BOOK_SEATS,ORDER_FNB,VIP_RECLINER_ACCESS,HEATED_SEATS,IN_SEAT_DELIVERY,VIEW_TICKETS,AGENT_ORCHESTRATE', TRUE),
('usr-adm-002', 'Marcus Kane', 'marcus.kane@cinemind-hq.com', '$2a$10$nb893xmrMDBoH8VRVIEr1Olwal7qhPjXZZFn1vYI1DOINoBWZ4ruK', 'EXECUTIVE_ADMIN', 'Circuit Operations Director', 'Circuit Executive Admin', 0.0, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop', 'VIEW_BOX_OFFICE,DYNAMIC_YIELD_SURGE,CATALOG_MUTATE,APM_TRACES,LLMOPS_TELEMETRY,RAG_INGESTION,AGENT_ORCHESTRATE,ADMIN_ACCESS,SCAN_GATE_PASS,MANAGE_RBAC,MANAGE_FNB_MENU', TRUE),
('usr-mgr-005', 'Elena Rostova', 'elena.rostova@cinemind-operations.com', '$2a$10$nb893xmrMDBoH8VRVIEr1Olwal7qhPjXZZFn1vYI1DOINoBWZ4ruK', 'CINEMA_MANAGER', 'Cinema Operations Manager', 'Operations Management', 0.30, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop', 'VIEW_MOVIES,BOOK_SEATS,ORDER_FNB,VIEW_TICKETS,SCAN_GATE_PASS,DISPATCH_FNB_ORDER,MANAGE_FNB_MENU,MANAGE_THEATRE,DYNAMIC_YIELD_SURGE,VIEW_BOX_OFFICE,CATALOG_MUTATE,MANAGE_RBAC,ADMIN_ACCESS', TRUE),
('usr-ush-003', 'Sarah Jenkins', 'sarah.jenkins@cinemind-theaters.com', '$2a$10$nb893xmrMDBoH8VRVIEr1Olwal7qhPjXZZFn1vYI1DOINoBWZ4ruK', 'AUDITORIUM_USHER', 'Auditorium Floor Usher', 'Floor Operations Staff', 0.10, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop', 'SCAN_GATE_PASS,OVERRIDE_TURNSTILE,DISPATCH_FNB_ORDER,WAYFINDER_GUIDE', TRUE),
('usr-gst-004', 'Jordan Lee', 'jordan.lee@example.com', '$2a$10$nb893xmrMDBoH8VRVIEr1Olwal7qhPjXZZFn1vYI1DOINoBWZ4ruK', 'STANDARD_GUEST', 'Standard Patron', 'General Member', 0.0, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop', 'BOOK_SEATS,ORDER_FNB,VIEW_TICKETS', TRUE)
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS split_users (
    id VARCHAR(64) PRIMARY KEY,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(64),
    avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS split_groups (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS split_group_members (
    group_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS split_expenses (
    id VARCHAR(64) PRIMARY KEY,
    group_id VARCHAR(64),
    name VARCHAR(255) NOT NULL,
    total_amount DOUBLE PRECISION NOT NULL,
    paid_by_user_id VARCHAR(64) NOT NULL,
    paid_by_user_name VARCHAR(255) NOT NULL,
    expense_type VARCHAR(64) NOT NULL,
    reference_type VARCHAR(64),
    reference_id VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS split_shares (
    id VARCHAR(64) PRIMARY KEY,
    expense_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    share_amount DOUBLE PRECISION NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    payment_method VARCHAR(64) NOT NULL DEFAULT 'PENDING',
    paid_at TIMESTAMP
);

-- Multi-Turn Conversations & Swarm Agent Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    session_type VARCHAR(64) NOT NULL,
    last_active_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    message_count INT NOT NULL DEFAULT 0,
    summary_text TEXT,
    messages_json TEXT
);
