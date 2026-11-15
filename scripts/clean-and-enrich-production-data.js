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
  console.log('Connected to PostgreSQL for clean production data curation.');

  // 1. Clean automated test bloat
  console.log('1. Cleaning test run bloat...');
  await client.query('DELETE FROM split_shares');
  await client.query('DELETE FROM split_expenses');
  await client.query('DELETE FROM wallet_transactions');
  await client.query('DELETE FROM concession_orders');
  await client.query('DELETE FROM tickets');

  // Standardize Circuit Auditoriums
  console.log('Aligning all movies with official circuit auditoriums...');
  await client.query(`
    UPDATE movies SET auditorium = 'Auditorium 1 — Grand GT Laser' WHERE auditorium LIKE '%Auditorium 1%' OR auditorium LIKE '%IMAX 70mm%' OR auditorium IS NULL;
    UPDATE movies SET auditorium = 'Auditorium 2 — Laser Studio' WHERE auditorium LIKE '%Screen 2%' OR auditorium LIKE '%Standard 70mm%';
    UPDATE movies SET auditorium = 'Auditorium 3 — Pavilion Dolby' WHERE auditorium LIKE '%Auditorium 3%' OR auditorium LIKE '%Dolby%';
    UPDATE movies SET auditorium = 'Auditorium 4 — Intimate Studio' WHERE auditorium LIKE '%Studio 4%' OR auditorium LIKE '%Standard Digital%';
    UPDATE movies SET auditorium = 'Auditorium 5 — ScreenX 270°' WHERE auditorium LIKE '%ScreenX%' OR auditorium LIKE '%Auditorium 5%';
    UPDATE movies SET auditorium = 'Auditorium 6 — 3D Laser Dome' WHERE auditorium LIKE '%3D Laser%' OR auditorium LIKE '%Auditorium 6%';
  `);

  // 2. Curate Digital Passes (8 clean, authentic production passes)
  console.log('2. Seeding clean production movie tickets...');
  const tickets = [
    {
      id: 'TKT-DUNE2-C3C4',
      movie: 'Dune: Part Two',
      show: '7:30 PM',
      fmt: 'IMAX 70mm',
      aud: 'Auditorium 1 — Grand GT Laser',
      seats: 'C3,C4',
      paid: 54.0,
      status: 'ISSUED'
    },
    {
      id: 'TKT-OPPEN-B1B2',
      movie: 'Oppenheimer',
      show: '6:15 PM',
      fmt: 'Standard 70mm',
      aud: 'Auditorium 2 — Laser Studio',
      seats: 'B1,B2',
      paid: 48.0,
      status: 'CHECKED_IN'
    },
    {
      id: 'TKT-INTER-C1C2',
      movie: 'Interstellar',
      show: '8:45 PM',
      fmt: 'IMAX 70mm',
      aud: 'Auditorium 1 — Grand GT Laser',
      seats: 'C1,C2',
      paid: 50.0,
      status: 'CHECKED_IN'
    },
    {
      id: 'TKT-SPIDER-C2C3',
      movie: 'Spider-Man: Across the Spider-Verse',
      show: '6:00 PM',
      fmt: 'Dolby Cinema',
      aud: 'Auditorium 3 — Pavilion Dolby',
      seats: 'C2,C3',
      paid: 42.0,
      status: 'ISSUED'
    },
    {
      id: 'TKT-PAST-B3B4',
      movie: 'Past Lives',
      show: '7:15 PM',
      fmt: 'Standard Digital',
      aud: 'Auditorium 4 — Intimate Studio',
      seats: 'B3,B4',
      paid: 32.0,
      status: 'CHECKED_IN'
    },
    {
      id: 'TKT-AVATAR-C1C2',
      movie: 'Avatar: Fire and Ash',
      show: '5:15 PM',
      fmt: 'IMAX 3D Laser',
      aud: 'Auditorium 6 — 3D Laser Dome',
      seats: 'C1,C2',
      paid: 58.0,
      status: 'ISSUED'
    },
    {
      id: 'TKT-DKNIGHT-D1D2',
      movie: 'The Dark Knight',
      show: '7:00 PM',
      fmt: 'IMAX 70mm',
      aud: 'Auditorium 1 — Grand GT Laser',
      seats: 'D1,D2',
      paid: 46.0,
      status: 'CHECKED_IN'
    },
    {
      id: 'TKT-EXPIRED-TEST1',
      movie: 'Blade Runner 2049',
      show: '11:00 AM',
      fmt: 'Dolby Cinema',
      aud: 'Auditorium 3 — Pavilion Dolby',
      seats: 'E1,E2',
      paid: 30.0,
      status: 'EXPIRED'
    }
  ];

  for (const t of tickets) {
    const { hmac, qrPayload } = signPass(t.id, t.movie, t.seats, t.paid);
    await client.query(
      'INSERT INTO tickets (ticket_id, movie_title, show_time, format, auditorium, seats_csv, total_paid, qr_payload, signature, status, issued_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())',
      [t.id, t.movie, t.show, t.fmt, t.aud, t.seats, t.paid, qrPayload, hmac, t.status]
    );
  }

  // 3. Curate Concession Orders (9 realistic orders across screens)
  console.log('3. Seeding clean production F&B orders...');
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
    }
  ];

  for (const o of orders) {
    await client.query(
      'INSERT INTO concession_orders (order_id, items_json, delivery_seat, total_amount, status, estimated_minutes, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [o.id, JSON.stringify(o.items), o.seat, o.total, o.status, o.mins]
    );
  }

  // 4. Curate Wallets & Double-Entry Ledger
  console.log('4. Curating wallets and transaction ledgers...');
  const wallets = [
    {
      id: 'WLT-USR_VIP_001',
      balance: 1250.0,
      txs: [
        { id: 'TX-VIP-01', type: 'TOP_UP', amount: 1000.0, after: 1000.0, desc: 'Founder Gold Tier Annual Reload' },
        { id: 'TX-VIP-02', type: 'PAYMENT', amount: -54.0, after: 946.0, desc: 'IMAX 70mm Dune Part Two Premium Recliners' },
        { id: 'TX-VIP-03', type: 'PAYMENT', amount: -24.5, after: 921.5, desc: 'Truffle Popcorn & Blackberry Craft Soda' },
        { id: 'TX-VIP-04', type: 'TOP_UP', amount: 328.5, after: 1250.0, desc: 'Instant Wallet Reload (Amex Platinum)' }
      ]
    },
    {
      id: 'WLT-USR_GST_004',
      balance: 150.0,
      txs: [
        { id: 'TX-GST-01', type: 'TOP_UP', amount: 150.0, after: 150.0, desc: 'Initial Patron Top-Up (Stripe Instant ACH)' }
      ]
    },
    {
      id: 'WLT-USR_MGR_005',
      balance: 500.0,
      txs: [
        { id: 'TX-MGR-01', type: 'TOP_UP', amount: 500.0, after: 500.0, desc: 'Manager Register Float & Customer Comp Vault' }
      ]
    },
    {
      id: 'WLT-USR_USH_003',
      balance: 100.0,
      txs: [
        { id: 'TX-USH-01', type: 'TOP_UP', amount: 100.0, after: 100.0, desc: 'Floor Staff Concession & Shift Allowance' }
      ]
    },
    {
      id: 'WLT-USR_ADM_002',
      balance: 5000.0,
      txs: [
        { id: 'TX-ADM-01', type: 'TOP_UP', amount: 5000.0, after: 5000.0, desc: 'Circuit Executive Operating Reserve' }
      ]
    }
  ];

  for (const w of wallets) {
    await client.query(
      'INSERT INTO wallets (wallet_id, currency, balance, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (wallet_id) DO UPDATE SET balance = $3, updated_at = NOW()',
      [w.id, 'USD', w.balance]
    );

    for (const tx of w.txs) {
      await client.query(
        'INSERT INTO wallet_transactions (transaction_id, wallet_id, type, amount, balance_after, description, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [tx.id, w.id, tx.type, tx.amount, tx.after, tx.desc]
      );
    }
  }

  // 5. Curate SplitMoney Squad Expenses (3 clean group outings)
  console.log('5. Curating SplitMoney squad expenses...');
  const expenses = [
    {
      id: 'EXP-DUNE2-GRP',
      groupId: 'grp-imax-squad',
      name: 'Dune: Part Two IMAX 70mm Group Booking',
      total: 96.0,
      paidById: 'usr-alex',
      paidByName: 'Alex Mercer',
      shares: [
        { userId: 'usr-alex', userName: 'Alex Mercer', amount: 24.0, isPaid: true, method: 'WALLET' },
        { userId: 'usr-marcus', userName: 'Marcus Kane', amount: 24.0, isPaid: true, method: 'WALLET' },
        { userId: 'usr-elena', userName: 'Elena Rostova', amount: 24.0, isPaid: false, method: 'PENDING' },
        { userId: 'usr-chloe', userName: 'Chloe Bennett', amount: 24.0, isPaid: false, method: 'PENDING' }
      ]
    },
    {
      id: 'EXP-PLATTER-FNB',
      groupId: 'grp-imax-squad',
      name: 'VIP Wagyu Sliders & Truffle Popcorn Platter',
      total: 58.0,
      paidById: 'usr-marcus',
      paidByName: 'Marcus Kane',
      shares: [
        { userId: 'usr-marcus', userName: 'Marcus Kane', amount: 14.5, isPaid: true, method: 'WALLET' },
        { userId: 'usr-alex', userName: 'Alex Mercer', amount: 14.5, isPaid: false, method: 'PENDING' },
        { userId: 'usr-elena', userName: 'Elena Rostova', amount: 14.5, isPaid: true, method: 'WALLET' },
        { userId: 'usr-chloe', userName: 'Chloe Bennett', amount: 14.5, isPaid: false, method: 'PENDING' }
      ]
    },
    {
      id: 'EXP-COCKTAILS',
      groupId: 'grp-imax-squad',
      name: 'Lincoln Square Lounge Post-Screening Drinks',
      total: 84.0,
      paidById: 'usr-elena',
      paidByName: 'Elena Rostova',
      shares: [
        { userId: 'usr-elena', userName: 'Elena Rostova', amount: 21.0, isPaid: true, method: 'WALLET' },
        { userId: 'usr-alex', userName: 'Alex Mercer', amount: 21.0, isPaid: false, method: 'PENDING' },
        { userId: 'usr-marcus', userName: 'Marcus Kane', amount: 21.0, isPaid: true, method: 'WALLET' },
        { userId: 'usr-chloe', userName: 'Chloe Bennett', amount: 21.0, isPaid: false, method: 'PENDING' }
      ]
    }
  ];

  for (const exp of expenses) {
    await client.query(
      'INSERT INTO split_expenses (id, group_id, name, total_amount, paid_by_user_id, paid_by_user_name, expense_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
      [exp.id, exp.groupId, exp.name, exp.total, exp.paidById, exp.paidByName, 'EQUAL']
    );

    for (let i = 0; i < exp.shares.length; i++) {
      const s = exp.shares[i];
      const shareId = 'SHR-' + exp.id.replace('EXP-', '') + '-' + (i + 1);
      await client.query(
        'INSERT INTO split_shares (id, expense_id, user_id, user_name, share_amount, is_paid, payment_method, paid_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [shareId, exp.id, s.userId, s.userName, s.amount, s.isPaid, s.method, s.isPaid ? new Date() : null]
      );
    }
  }

  console.log('✅ Clean, production-alike data successfully curated in PostgreSQL!');
  await client.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
