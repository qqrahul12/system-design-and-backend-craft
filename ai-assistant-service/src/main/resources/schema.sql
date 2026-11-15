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
