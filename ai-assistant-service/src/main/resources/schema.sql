-- CineMind Relational Schema
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
    balance DOUBLE PRECISION NOT NULL DEFAULT 150.00,
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
