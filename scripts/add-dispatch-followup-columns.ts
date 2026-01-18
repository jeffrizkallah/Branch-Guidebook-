/**
 * Migration script to add follow-up dispatch columns to the dispatches table
 * 
 * Run this script to add:
 * - type: 'primary' | 'follow_up'
 * - parent_dispatch_id: Links follow-up to parent dispatch
 * - follow_up_dispatch_ids: Array of follow-up dispatch IDs
 * 
 * Usage: npx tsx scripts/add-dispatch-followup-columns.ts
 */

import { config } from 'dotenv'
// Load environment variables from .env.local
config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function addFollowUpColumns() {
  console.log('🔧 Adding follow-up dispatch columns to dispatches table...\n')
  
  try {
    // Add 'type' column with default 'primary'
    console.log('Adding type column...')
    await sql`
      ALTER TABLE dispatches 
      ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'primary'
    `
    console.log('✓ type column added\n')
    
    // Add 'parent_dispatch_id' column
    console.log('Adding parent_dispatch_id column...')
    await sql`
      ALTER TABLE dispatches 
      ADD COLUMN IF NOT EXISTS parent_dispatch_id VARCHAR(255)
    `
    console.log('✓ parent_dispatch_id column added\n')
    
    // Add 'follow_up_dispatch_ids' column as JSONB array
    console.log('Adding follow_up_dispatch_ids column...')
    await sql`
      ALTER TABLE dispatches 
      ADD COLUMN IF NOT EXISTS follow_up_dispatch_ids JSONB DEFAULT '[]'::jsonb
    `
    console.log('✓ follow_up_dispatch_ids column added\n')
    
    // Update existing dispatches to have type='primary'
    console.log('Setting type=primary for existing dispatches...')
    const result = await sql`
      UPDATE dispatches 
      SET type = 'primary' 
      WHERE type IS NULL
    `
    console.log(`✓ Updated ${result.rowCount} existing dispatches\n`)
    
    // Verify the columns exist
    console.log('Verifying columns...')
    const verification = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'dispatches' 
      AND column_name IN ('type', 'parent_dispatch_id', 'follow_up_dispatch_ids')
      ORDER BY column_name
    `
    
    console.log('\nColumns in dispatches table:')
    verification.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`)
    })
    
    console.log('\n✅ Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run the migration
addFollowUpColumns()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
