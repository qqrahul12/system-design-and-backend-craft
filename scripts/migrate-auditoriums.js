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
  console.log('Connected to PostgreSQL database.');

  // 1. Create auditoriums table
  await client.query(`
    CREATE TABLE IF NOT EXISTS auditoriums (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      format VARCHAR(64) NOT NULL,
      capacity INT NOT NULL DEFAULT 30,
      surge_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      perk TEXT,
      sound_system VARCHAR(128),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Insert or update auditoriums
  const auditoriums = [
    { id: 'aud-01', name: 'Auditorium 1 — Grand GT Laser', format: 'IMAX 70mm', capacity: 30, surge: 1.15, perk: 'Dual 4K Commercial Laser • 1.43:1 Giant Dome', sound: '12-Channel IMAX Immersive Audio' },
    { id: 'aud-02', name: 'Auditorium 2 — Laser Studio', format: 'Standard 70mm', capacity: 30, surge: 1.05, perk: '70mm 5-perf Physical Film Optics • 2.39:1 CinemaScope', sound: 'Dolby 7.1 Studio Surround' },
    { id: 'aud-03', name: 'Auditorium 3 — Pavilion Dolby', format: 'Dolby Cinema', capacity: 30, surge: 1.10, perk: 'Dolby Vision HDR • 128-ch Atmos Spatial Immersion', sound: 'Dolby Atmos 128-ch Spatial' },
    { id: 'aud-04', name: 'Auditorium 4 — Intimate Studio', format: 'Standard Digital', capacity: 30, surge: 1.00, perk: 'Acoustic Wool Baffling • 7.1 Studio Surround', sound: '7.1 Studio Reference' },
    { id: 'aud-05', name: 'Auditorium 5 — ScreenX 270°', format: 'ScreenX 270°', capacity: 30, surge: 1.12, perk: '3-Screen Panoramic Peripheral Immersion', sound: 'Dolby Atmos Multi-Array' },
    { id: 'aud-06', name: 'Auditorium 6 — 3D Laser Dome', format: 'IMAX 3D Laser', capacity: 30, surge: 1.18, perk: 'Active Shutter 4K Laser 3D Reference', sound: '12-Channel IMAX Spatial Audio' }
  ];

  for (const aud of auditoriums) {
    await client.query(`
      INSERT INTO auditoriums (id, name, format, capacity, surge_multiplier, perk, sound_system)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = $2,
        format = $3,
        capacity = $4,
        surge_multiplier = $5,
        perk = $6,
        sound_system = $7
    `, [aud.id, aud.name, aud.format, aud.capacity, aud.surge, aud.perk, aud.sound]);
  }
  console.log('Auditoriums table seeded with 6 circuit screens.');

  // 3. Align movies table with clean auditorium names
  await client.query(`
    UPDATE movies SET auditorium = 'Auditorium 1 — Grand GT Laser' WHERE auditorium LIKE '%Auditorium 1%' OR auditorium LIKE '%IMAX 70mm%' OR auditorium IS NULL;
    UPDATE movies SET auditorium = 'Auditorium 2 — Laser Studio' WHERE auditorium LIKE '%Screen 2%' OR auditorium LIKE '%Standard 70mm%';
    UPDATE movies SET auditorium = 'Auditorium 3 — Pavilion Dolby' WHERE auditorium LIKE '%Auditorium 3%' OR auditorium LIKE '%Dolby%';
    UPDATE movies SET auditorium = 'Auditorium 4 — Intimate Studio' WHERE auditorium LIKE '%Studio 4%' OR auditorium LIKE '%Standard Digital%';
    UPDATE movies SET auditorium = 'Auditorium 5 — ScreenX 270°' WHERE auditorium LIKE '%ScreenX%' OR auditorium LIKE '%Auditorium 5%';
    UPDATE movies SET auditorium = 'Auditorium 6 — 3D Laser Dome' WHERE auditorium LIKE '%3D Laser%' OR auditorium LIKE '%Auditorium 6%';
  `);

  // Specific movie assignments:
  await client.query(`UPDATE movies SET auditorium = 'Auditorium 1 — Grand GT Laser' WHERE title IN ('Dune: Part Two', 'Interstellar', 'Gladiator II', 'Inception')`);
  await client.query(`UPDATE movies SET auditorium = 'Auditorium 2 — Laser Studio' WHERE title IN ('Oppenheimer')`);
  await client.query(`UPDATE movies SET auditorium = 'Auditorium 3 — Pavilion Dolby' WHERE title IN ('Spider-Man: Across the Spider-Verse', 'Blade Runner 2049', 'The Matrix')`);
  await client.query(`UPDATE movies SET auditorium = 'Auditorium 4 — Intimate Studio' WHERE title IN ('Past Lives')`);
  await client.query(`UPDATE movies SET auditorium = 'Auditorium 5 — ScreenX 270°' WHERE title IN ('Tron: Ares')`);
  await client.query(`UPDATE movies SET auditorium = 'Auditorium 6 — 3D Laser Dome' WHERE title IN ('Avatar: Fire and Ash')`);

  // 4. Align tickets with clean auditorium names
  await client.query(`
    UPDATE tickets SET auditorium = 'Auditorium 1 — Grand GT Laser' WHERE movie_title IN ('Dune: Part Two', 'Interstellar', 'The Dark Knight');
    UPDATE tickets SET auditorium = 'Auditorium 2 — Laser Studio' WHERE movie_title = 'Oppenheimer';
    UPDATE tickets SET auditorium = 'Auditorium 3 — Pavilion Dolby' WHERE movie_title IN ('Spider-Man: Across the Spider-Verse', 'Blade Runner 2049');
    UPDATE tickets SET auditorium = 'Auditorium 4 — Intimate Studio' WHERE movie_title = 'Past Lives';
    UPDATE tickets SET auditorium = 'Auditorium 6 — 3D Laser Dome' WHERE movie_title = 'Avatar: Fire and Ash';
  `);

  const auds = await client.query('SELECT id, name, format, capacity, surge_multiplier, sound_system FROM auditoriums ORDER BY id');
  console.log('Auditoriums in DB:', auds.rows);

  const movies = await client.query('SELECT id, title, auditorium FROM movies ORDER BY id LIMIT 8');
  console.log('Sample movies with updated auditoriums:', movies.rows);

  const tickets = await client.query('SELECT ticket_id, movie_title, auditorium, seats_csv FROM tickets ORDER BY ticket_id');
  console.log('Tickets aligned with auditoriums:', tickets.rows);

  await client.end();
}

main().catch(console.error);
