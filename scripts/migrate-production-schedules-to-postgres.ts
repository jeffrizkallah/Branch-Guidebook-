/**
 * Migrate production schedules from JSON file to PostgreSQL
 * 
 * This script:
 * 1. Creates the production_schedules table
 * 2. Migrates existing schedules from data/production-schedules.json
 * 
 * Run with: npx tsx scripts/migrate-production-schedules-to-postgres.ts
 */

import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local
config({ path: '.env.local' })

interface ProductionSchedule {
  scheduleId: string
  weekStart: string
  weekEnd: string
  createdBy: string
  createdAt: string
  days: Array<{
    date: string
    dayName: string
    items: any[]
  }>
}

async function migrateProductionSchedules() {
  console.log('🚀 Starting production schedules migration to Postgres...\n')

  const sql = neon(process.env.DATABASE_URL!)

  try {
    // Step 1: Create production_schedules table
    console.log('📋 Creating production_schedules table...')
    await sql`
      CREATE TABLE IF NOT EXISTS production_schedules (
        schedule_id TEXT PRIMARY KEY,
        schedule_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('✓ Table created successfully\n')

    // Create indexes
    console.log('📊 Creating indexes...')
    await sql`
      CREATE INDEX IF NOT EXISTS idx_production_schedules_week_start 
      ON production_schedules((schedule_data->>'weekStart'))
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_production_schedules_week_end 
      ON production_schedules((schedule_data->>'weekEnd'))
    `
    console.log('✓ Indexes created successfully\n')

    // Step 2: Read production schedules from JSON file
    const schedulesFilePath = join(process.cwd(), 'data', 'production-schedules.json')
    let schedules: ProductionSchedule[] = []
    
    try {
      const fileContent = readFileSync(schedulesFilePath, 'utf-8')
      schedules = JSON.parse(fileContent)
      console.log(`📦 Found ${schedules.length} production schedules to migrate\n`)
    } catch (err) {
      console.log('📦 No production schedules file found or file is empty')
      console.log('✅ Migration complete (no data to migrate)\n')
      return
    }

    // Step 3: Migrate schedules to database
    let successCount = 0
    let errorCount = 0

    console.log('📥 Migrating production schedules...')
    for (const schedule of schedules) {
      try {
        await sql`
          INSERT INTO production_schedules (schedule_id, schedule_data)
          VALUES (${schedule.scheduleId}, ${JSON.stringify(schedule)}::jsonb)
          ON CONFLICT (schedule_id) 
          DO UPDATE SET 
            schedule_data = ${JSON.stringify(schedule)}::jsonb,
            updated_at = CURRENT_TIMESTAMP
        `
        successCount++
        console.log(`  ✓ Migrated: ${schedule.scheduleId} (Week of ${schedule.weekStart})`)
      } catch (error) {
        errorCount++
        console.error(`  ✗ Failed: ${schedule.scheduleId}`, error)
      }
    }

    console.log('\n✅ Migration complete!')
    console.log(`   Success: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)
    console.log(`   Total: ${schedules.length}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migration
migrateProductionSchedules()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error)
    process.exit(1)
  })
