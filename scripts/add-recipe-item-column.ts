/**
 * Migration: Add item column to odoo_recipe table
 * 
 * This migration adds the 'item' column to store the recipe/product name
 * from the Excel file (e.g., "Okra in oil Kg", "HL Healthy Fish and Chips")
 * 
 * Run with: npx tsx scripts/add-recipe-item-column.ts
 */

import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!)

  console.log('═'.repeat(50))
  console.log('🔄 MIGRATING odoo_recipe TABLE')
  console.log('═'.repeat(50))
  console.log('')

  try {
    // Add item column if it doesn't exist
    console.log('📝 Adding item column...')
    await sql`
      ALTER TABLE odoo_recipe 
      ADD COLUMN IF NOT EXISTS item VARCHAR(255)
    `
    console.log('✓ Item column added')

    // Add index for better query performance
    console.log('📊 Creating index on item column...')
    await sql`
      CREATE INDEX IF NOT EXISTS idx_recipe_item ON odoo_recipe(item)
    `
    console.log('✓ Index created')

    // Add index for product_group if it doesn't exist
    console.log('📊 Creating index on product_group column...')
    await sql`
      CREATE INDEX IF NOT EXISTS idx_recipe_product_group ON odoo_recipe(product_group)
    `
    console.log('✓ Index created')

    console.log('')
    console.log('═'.repeat(50))
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY')
    console.log('═'.repeat(50))
    console.log('')
    console.log('📋 Summary:')
    console.log('   - Added: item column (VARCHAR(255))')
    console.log('   - Created: idx_recipe_item index')
    console.log('   - Created: idx_recipe_product_group index')
    console.log('')
    console.log('🎯 Next steps:')
    console.log('   - Run the sync script to populate the new column')
    console.log('   - Command: node scripts/sync-all-sharepoint.js')
    console.log('')

  } catch (error) {
    console.error('')
    console.error('═'.repeat(50))
    console.error('❌ MIGRATION FAILED')
    console.error('═'.repeat(50))
    console.error('Error:', error)
    process.exit(1)
  }
}

migrate()
