const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  if (line.trim() && !line.startsWith('#') && line.includes('=')) {
    const idx = line.indexOf('=');
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
}

const client = new Client({
  host: 'cinemind-low-grain.bulrush.cloud.layerbase.dev',
  port: 5432,
  database: 'cinemind',
  user: env.SPRING_DATASOURCE_USERNAME,
  password: env.SPRING_DATASOURCE_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('=== CINEMIND DATABASE INTEGRITY AUDIT ===\n');

  // 1. Table Counts
  const tables = [
    'user_profiles',
    'auditoriums',
    'movies',
    'tickets',
    'concession_items',
    'concession_orders',
    'wallets',
    'wallet_transactions',
    'split_users',
    'split_groups',
    'split_group_members',
    'split_expenses',
    'split_shares',
    'chat_sessions'
  ];

  console.log('--- 1. TABLE ROW COUNTS ---');
  for (const table of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table.padEnd(25)}: ${res.rows[0].count} rows`);
    } catch (e) {
      console.log(`${table.padEnd(25)}: TABLE NOT FOUND or ERROR (${e.message})`);
    }
  }

  // 2. User Profiles
  console.log('\n--- 2. USER PROFILES & ROLES ---');
  const users = await client.query('SELECT user_id, full_name, email, role, membership_tier FROM user_profiles ORDER BY role');
  console.table(users.rows);

  // 3. Auditoriums
  console.log('\n--- 3. CIRCUIT AUDITORIUMS ---');
  const auds = await client.query('SELECT id, name, format, capacity, surge_multiplier, sound_system FROM auditoriums ORDER BY id');
  console.table(auds.rows);

  // 4. Movies & Auditorium Linkage
  console.log('\n--- 4. MOVIES & AUDITORIUM LINKAGE ---');
  const movies = await client.query(`
    SELECT m.id, m.title, m.auditorium, m.status, m.price, m.occupancy_rate,
      CASE WHEN a.name IS NOT NULL THEN 'LINKED_OK' ELSE 'ORPHAN_AUDITORIUM' END AS auditorium_status
    FROM movies m
    LEFT JOIN auditoriums a ON m.auditorium = a.name
    ORDER BY m.id
  `);
  console.table(movies.rows);

  // 5. Tickets & Movies/Auditoriums Linkage
  console.log('\n--- 5. TICKETS & RELATIONAL INTEGRITY ---');
  const tickets = await client.query(`
    SELECT t.ticket_id, t.movie_title, t.show_time, t.format, t.auditorium, t.seats_csv, t.total_paid, t.status,
      CASE WHEN m.title IS NOT NULL THEN 'MOVIE_MATCH' ELSE 'ORPHAN_MOVIE' END AS movie_link,
      CASE WHEN a.name IS NOT NULL THEN 'AUD_MATCH' ELSE 'ORPHAN_AUD' END AS aud_link
    FROM tickets t
    LEFT JOIN movies m ON t.movie_title = m.title
    LEFT JOIN auditoriums a ON t.auditorium = a.name
    ORDER BY t.ticket_id
  `);
  console.table(tickets.rows);

  // 6. Concession Orders & Delivery Seat Linkage
  console.log('\n--- 6. CONCESSION ORDERS & SEAT/AUDITORIUM LINKAGE ---');
  const orders = await client.query(`
    SELECT order_id, delivery_seat, total_amount, status, estimated_minutes
    FROM concession_orders
    ORDER BY order_id
  `);
  console.table(orders.rows);

  // 7. Wallets & Transactions
  console.log('\n--- 7. WALLETS & IMMUTABLE LEDGER ---');
  const wallets = await client.query('SELECT wallet_id, currency, balance, updated_at FROM wallets');
  console.table(wallets.rows);

  const txs = await client.query('SELECT transaction_id, wallet_id, type, amount, balance_after, description FROM wallet_transactions ORDER BY created_at');
  console.table(txs.rows);

  // 8. Split Squads
  console.log('\n--- 8. SPLIT SQUADS & EXPENSES ---');
  const squadUsers = await client.query('SELECT id, first_name, last_name, email FROM split_users');
  console.table(squadUsers.rows);

  const expenses = await client.query(`
    SELECT e.id, e.name, e.total_amount, e.paid_by_user_name,
      COALESCE(SUM(s.share_amount), 0) AS total_shares_sum,
      CASE WHEN ABS(e.total_amount - COALESCE(SUM(s.share_amount), 0)) < 0.01 THEN 'BALANCED' ELSE 'MISMATCH' END AS balance_status
    FROM split_expenses e
    LEFT JOIN split_shares s ON e.id = s.expense_id
    GROUP BY e.id, e.name, e.total_amount, e.paid_by_user_name
    ORDER BY e.id
  `);
  console.table(expenses.rows);

  await client.end();
  console.log('\n=== AUDIT COMPLETE ===');
}

main().catch(console.error);
