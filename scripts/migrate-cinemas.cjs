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

async function runMigration() {
  await client.connect();
  console.log('Connected to PostgreSQL for Cinemas & Venues schema migration.');

  // 1. Create cinemas table
  await client.query(`
    CREATE TABLE IF NOT EXISTS cinemas (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      short_name VARCHAR(100) NOT NULL,
      neighborhood VARCHAR(100),
      distance VARCHAR(50),
      address VARCHAR(255),
      features TEXT[]
    );
  `);

  // 2. Add foreign key cinema_id to auditoriums if not present
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auditoriums' AND column_name = 'cinema_id'
      ) THEN
        ALTER TABLE auditoriums ADD COLUMN cinema_id VARCHAR(50) REFERENCES cinemas(id);
      END IF;
    END $$;
  `);

  // 3. Upsert official cinema venues
  const venues = [
    {
      id: 'flagship-lincoln',
      name: 'CineMind Flagship — Lincoln Square',
      short_name: 'Lincoln Square',
      neighborhood: 'Upper West Side',
      distance: '1.8 mi',
      address: '1998 Broadway, New York, NY',
      features: ['IMAX 70mm Dual Laser', 'Dolby Atmos 128-ch', 'VIP Heated Recliners', 'Craft Dining Bar'],
    },
    {
      id: 'west-end-pavilion',
      name: 'CineMind West End Pavilion',
      short_name: 'West End',
      neighborhood: "Hell's Kitchen",
      distance: '4.2 mi',
      address: '610 W 54th St, New York, NY',
      features: ['Dolby Cinema Reference', 'In-Seat Chef Dining', 'Artisan Cocktail Lounge'],
    },
    {
      id: 'uptown-arts-center',
      name: 'CineMind Uptown IMAX Arts Center',
      short_name: 'Uptown Arts',
      neighborhood: 'Carnegie Hill',
      distance: '6.5 mi',
      address: '1220 Lexington Ave, New York, NY',
      features: ['Curated Art Repertory', 'Sommelier Wine Bar', 'Acoustic Wool Baffling'],
    },
  ];

  for (const v of venues) {
    await client.query(
      `INSERT INTO cinemas (id, name, short_name, neighborhood, distance, address, features)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = $2,
         short_name = $3,
         neighborhood = $4,
         distance = $5,
         address = $6,
         features = $7`,
      [v.id, v.name, v.short_name, v.neighborhood, v.distance, v.address, v.features]
    );
  }

  // 4. Link auditoriums to their respective cinemas with FK
  const screenToCinema = [
    { audId: 'aud-01', cinemaId: 'flagship-lincoln' },
    { audId: 'aud-02', cinemaId: 'west-end-pavilion' },
    { audId: 'aud-03', cinemaId: 'west-end-pavilion' },
    { audId: 'aud-04', cinemaId: 'uptown-arts-center' },
    { audId: 'aud-05', cinemaId: 'flagship-lincoln' },
    { audId: 'aud-06', cinemaId: 'uptown-arts-center' },
  ];

  for (const s of screenToCinema) {
    await client.query(`UPDATE auditoriums SET cinema_id = $1 WHERE id = $2`, [s.cinemaId, s.audId]);
  }

  console.log('✅ Cinemas and linked auditorium foreign keys created successfully in PostgreSQL!');
  await client.end();
}

runMigration().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
