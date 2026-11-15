const crypto = require('crypto');
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

const HMAC_SECRET = 'cinemind-enterprise-gate-secret-key-2026';

function signPass(ticketId, movieTitle, seatsCsv, totalPaid) {
  const paidStr = totalPaid.toFixed(1);
  const expectedPayload = ticketId + ':' + movieTitle + ':' + seatsCsv + ':' + paidStr;
  const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(expectedPayload).digest('hex');
  const qrPayload = ticketId + ':' + movieTitle + ':' + seatsCsv + ':' + paidStr + ':' + hmac.substring(0, 8);
  return { hmac, qrPayload };
}

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL for demo data enrichment.');

  // 1. Enrich Wallets
  console.log('1. Enriching Wallets...');
  const walletUpdates = [
    { id: 'WLT-USR_GST_004', balance: 150.0, desc: 'Initial Patron Top-Up (Stripe Instant ACH)' },
    { id: 'WLT-USR_MGR_005', balance: 500.0, desc: 'Manager Cash Register & Customer Comp Vault' },
    { id: 'WLT-USR_USH_003', balance: 100.0, desc: 'Floor Staff Concession & Wayfinder Allowance' },
    { id: 'WLT-USR_VIP_001', balance: 1250.0, desc: 'Founder Gold VIP Patron Reload' },
    { id: 'WLT-USR_ADM_002', balance: 5000.0, desc: 'Executive Circuit Operating Reserve' }
  ];

  for (const w of walletUpdates) {
    const existing = await client.query('SELECT wallet_id FROM wallets WHERE wallet_id = $1', [w.id]);
    if (existing.rows.length === 0) {
      await client.query('INSERT INTO wallets (wallet_id, currency, balance, updated_at) VALUES ($1, $2, $3, NOW())', [w.id, 'USD', w.balance]);
    } else {
      await client.query('UPDATE wallets SET balance = $1, updated_at = NOW() WHERE wallet_id = $2', [w.balance, w.id]);
    }

    const txId = 'TX-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    await client.query(
      'INSERT INTO wallet_transactions (transaction_id, wallet_id, type, amount, balance_after, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [txId, w.id, 'TOP_UP', w.balance, w.balance, w.desc]
    );
  }

  // 2. Enrich Concession Orders across ALL screens and filters
  console.log('2. Enriching Concession Orders across all auditoriums & counter...');
  const orders = [
    {
      id: 'ORD-A1-C3',
      seat: 'Auditorium 1 — Grand GT Laser, Seat C3',
      total: 24.50,
      status: 'READY',
      mins: 2,
      items: [
        { name: 'Black Truffle & Rosemary Popcorn', quantity: 1, price: 11.0 },
        { name: 'Wild Blackberry Craft Soda', quantity: 2, price: 6.0 },
        { name: 'Dark Chocolate Sea Salt Pretzel Bites', quantity: 1, price: 7.5 }
      ]
    },
    {
      id: 'ORD-A1-D4',
      seat: 'Auditorium 1 — Grand GT Laser, Seat D4',
      total: 21.50,
      status: 'PREPARING',
      mins: 5,
      items: [
        { name: 'Artisan Warm Butter Popcorn', quantity: 1, price: 8.5 },
        { name: 'Nitro Vanilla Sky Cold Brew', quantity: 1, price: 7.0 },
        { name: 'Wild Blackberry Craft Soda', quantity: 1, price: 6.0 }
      ]
    },
    {
      id: 'ORD-A1-B2',
      seat: 'Auditorium 1 — Grand GT Laser, Seat B2',
      total: 14.50,
      status: 'DELIVERED',
      mins: 0,
      items: [
        { name: 'Wagyu Beef Brioche Sliders (2pc)', quantity: 1, price: 14.5 }
      ]
    },
    {
      id: 'ORD-A2-B2',
      seat: 'Auditorium 2 — Laser Studio, Seat B2',
      total: 19.00,
      status: 'READY',
      mins: 1,
      items: [
        { name: 'Chipotle Queso Loaded Nachos', quantity: 1, price: 10.5 },
        { name: 'Artisan Sicilian Pistachio Gelato', quantity: 1, price: 8.5 }
      ]
    },
    {
      id: 'ORD-A2-C5',
      seat: 'Auditorium 2 — Laser Studio, Seat C5',
      total: 29.00,
      status: 'PREPARING',
      mins: 6,
      items: [
        { name: 'Wagyu Beef Brioche Sliders (2pc)', quantity: 2, price: 29.0 }
      ]
    },
    {
      id: 'ORD-A2-D1',
      seat: 'Auditorium 2 — Laser Studio, Seat D1',
      total: 16.00,
      status: 'DELIVERED',
      mins: 0,
      items: [
        { name: 'Artisan Warm Butter Popcorn', quantity: 1, price: 8.5 },
        { name: 'Dark Chocolate Sea Salt Pretzel Bites', quantity: 1, price: 7.5 }
      ]
    },
    {
      id: 'ORD-CTR-01',
      seat: 'Counter Pickup — Express Bar #1',
      total: 18.00,
      status: 'READY',
      mins: 2,
      items: [
        { name: 'Wild Blackberry Craft Soda', quantity: 3, price: 18.0 }
      ]
    },
    {
      id: 'ORD-CTR-02',
      seat: 'Counter Pickup — Concessions Register A',
      total: 25.50,
      status: 'PREPARING',
      mins: 4,
      items: [
        { name: 'Black Truffle & Rosemary Popcorn', quantity: 1, price: 11.0 },
        { name: 'Wagyu Beef Brioche Sliders (2pc)', quantity: 1, price: 14.5 }
      ]
    },
    {
      id: 'ORD-CTR-03',
      seat: 'Counter Pickup — Lounge Bar #2',
      total: 17.00,
      status: 'DELIVERED',
      mins: 0,
      items: [
        { name: 'Artisan Sicilian Pistachio Gelato', quantity: 2, price: 17.0 }
      ]
    },
    {
      id: 'ORD-DOL-C3',
      seat: 'Auditorium A — Pavilion Dolby 1, Seat C3',
      total: 22.00,
      status: 'READY',
      mins: 2,
      items: [
        { name: 'Black Truffle & Rosemary Popcorn', quantity: 1, price: 11.0 },
        { name: 'Chipotle Queso Loaded Nachos', quantity: 1, price: 10.5 }
      ]
    }
  ];

  for (const o of orders) {
    const existing = await client.query('SELECT order_id FROM concession_orders WHERE order_id = $1', [o.id]);
    if (existing.rows.length === 0) {
      await client.query(
        'INSERT INTO concession_orders (order_id, items_json, delivery_seat, total_amount, status, estimated_minutes, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [o.id, JSON.stringify(o.items), o.seat, o.total, o.status, o.mins]
      );
    } else {
      await client.query(
        'UPDATE concession_orders SET items_json = $1, delivery_seat = $2, total_amount = $3, status = $4, estimated_minutes = $5, created_at = NOW() WHERE order_id = $6',
        [JSON.stringify(o.items), o.seat, o.total, o.status, o.mins, o.id]
      );
    }
  }

  // 3. Enrich Digital Passes (Tickets) across movies and screens
  console.log('3. Enriching Digital Tickets across top movies and screens...');
  const newTickets = [
    {
      id: 'TKT-DUNE2-C3C4',
      movie: 'Dune: Part Two',
      show: '7:30 PM',
      fmt: 'IMAX 70mm',
      aud: 'IMAX 70mm Auditorium 1',
      seats: 'C3,C4',
      paid: 54.0,
      status: 'ISSUED'
    },
    {
      id: 'TKT-DUNE2-A1A2',
      movie: 'Dune: Part Two',
      show: '3:45 PM',
      fmt: 'IMAX 70mm',
      aud: 'IMAX 70mm Auditorium 1',
      seats: 'A1,A2',
      paid: 60.0,
      status: 'CHECKED_IN'
    },
    {
      id: 'TKT-OPPEN-B1B2',
      movie: 'Oppenheimer',
      show: '6:15 PM',
      fmt: 'Standard 70mm',
      aud: '70mm Large Format Screen 2',
      seats: 'B1,B2',
      paid: 48.0,
      status: 'ISSUED'
    },
    {
      id: 'TKT-OPPEN-D3D4',
      movie: 'Oppenheimer',
      show: '2:00 PM',
      fmt: 'Standard 70mm',
      aud: '70mm Large Format Screen 2',
      seats: 'D3,D4',
      paid: 44.0,
      status: 'CHECKED_IN'
    },
    {
      id: 'TKT-SPIDER-C2C3',
      movie: 'Spider-Man: Across the Spider-Verse',
      show: '6:00 PM',
      fmt: 'Dolby Cinema',
      aud: 'Dolby Cinema Auditorium 3',
      seats: 'C2,C3',
      paid: 42.0,
      status: 'ISSUED'
    },
    {
      id: 'TKT-PAST-B3B4',
      movie: 'Past Lives',
      show: '7:15 PM',
      fmt: 'Standard Digital',
      aud: 'Indie Studio 4',
      seats: 'B3,B4',
      paid: 32.0,
      status: 'ISSUED'
    },
    {
      id: 'TKT-AVATAR-C1C2',
      movie: 'Avatar: Fire and Ash',
      show: '5:15 PM',
      fmt: 'IMAX 3D Laser',
      aud: 'IMAX 3D Laser Auditorium 1',
      seats: 'C1,C2',
      paid: 58.0,
      status: 'ISSUED'
    },
    {
      id: 'TKT-DKNIGHT-D1D2',
      movie: 'The Dark Knight',
      show: '7:00 PM',
      fmt: 'IMAX 70mm',
      aud: 'IMAX 70mm Auditorium 1',
      seats: 'D1,D2',
      paid: 46.0,
      status: 'CHECKED_IN'
    },
    {
      id: 'TKT-EEAAO-A3A4',
      movie: 'Everything Everywhere All at Once',
      show: '6:00 PM',
      fmt: 'Standard Digital',
      aud: 'Indie Studio 4',
      seats: 'A3,A4',
      paid: 34.0,
      status: 'ISSUED'
    },
    {
      id: 'TKT-EXPIRED-TEST1',
      movie: 'Blade Runner 2049',
      show: '11:00 AM',
      fmt: 'Dolby Cinema',
      aud: 'Dolby Cinema Auditorium 3',
      seats: 'E1,E2',
      paid: 30.0,
      status: 'EXPIRED'
    }
  ];

  for (const t of newTickets) {
    const { hmac, qrPayload } = signPass(t.id, t.movie, t.seats, t.paid);
    const existing = await client.query('SELECT ticket_id FROM tickets WHERE ticket_id = $1', [t.id]);
    if (existing.rows.length === 0) {
      await client.query(
        'INSERT INTO tickets (ticket_id, movie_title, show_time, format, auditorium, seats_csv, total_paid, qr_payload, signature, status, issued_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())',
        [t.id, t.movie, t.show, t.fmt, t.aud, t.seats, t.paid, qrPayload, hmac, t.status]
      );
    } else {
      await client.query(
        'UPDATE tickets SET movie_title = $1, show_time = $2, format = $3, auditorium = $4, seats_csv = $5, total_paid = $6, qr_payload = $7, signature = $8, status = $9, issued_at = NOW() WHERE ticket_id = $10',
        [t.movie, t.show, t.fmt, t.aud, t.seats, t.paid, qrPayload, hmac, t.status, t.id]
      );
    }
  }

  console.log('✅ Demo data enriched successfully in PostgreSQL!');
  await client.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
