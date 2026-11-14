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
