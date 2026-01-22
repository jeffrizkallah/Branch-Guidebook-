import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function migrate() {
  try {
    console.log('Adding station_assignment column to users table...');

    // Add station_assignment column if it doesn't exist
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS station_assignment VARCHAR(50)
    `;

    console.log('✓ Migration completed successfully!');
    console.log('  station_assignment column added to users table');

    // Verify the column exists
    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'station_assignment'
    `;

    if (result.rows.length > 0) {
      console.log('✓ Verified: column exists with type', result.rows[0].data_type);
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
