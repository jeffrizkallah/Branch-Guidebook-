/**
 * Create tables for automated inventory checking system
 * 
 * Tables created:
 * - inventory_checks: History of all inventory checks performed
 * - ingredient_shortages: Specific ingredient shortages found in each check
 * - ingredient_mappings: Maps recipe ingredient names to inventory item names
 * 
 * Run with: npx tsx scripts/create-inventory-check-tables.ts
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

async function createInventoryCheckTables() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log('═'.repeat(70));
  console.log('🏗️  Creating Automated Inventory Check Tables');
  console.log('═'.repeat(70));
  
  try {
    // Table 1: inventory_checks
    console.log('\n📋 Creating inventory_checks table...');
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_checks (
        check_id TEXT PRIMARY KEY,
        schedule_id TEXT NOT NULL,
        check_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        production_dates TEXT[] NOT NULL,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        total_ingredients_required INTEGER DEFAULT 0,
        missing_ingredients_count INTEGER DEFAULT 0,
        partial_ingredients_count INTEGER DEFAULT 0,
        sufficient_ingredients_count INTEGER DEFAULT 0,
        overall_status TEXT NOT NULL,
        checked_by TEXT,
        check_type TEXT DEFAULT 'MANUAL',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_status CHECK (status IN ('COMPLETED', 'FAILED', 'IN_PROGRESS')),
        CONSTRAINT check_overall_status CHECK (overall_status IN ('ALL_GOOD', 'PARTIAL_SHORTAGE', 'CRITICAL_SHORTAGE'))
      )
    `;
    console.log('✅ inventory_checks table created');
    
    // Table 2: ingredient_shortages
    console.log('\n📋 Creating ingredient_shortages table...');
    await sql`
      CREATE TABLE IF NOT EXISTS ingredient_shortages (
        shortage_id TEXT PRIMARY KEY,
        check_id TEXT NOT NULL REFERENCES inventory_checks(check_id) ON DELETE CASCADE,
        schedule_id TEXT NOT NULL,
        production_date TEXT NOT NULL,
        ingredient_name TEXT NOT NULL,
        inventory_item_name TEXT,
        required_quantity DECIMAL(10, 2) NOT NULL,
        available_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
        shortfall_amount DECIMAL(10, 2) NOT NULL,
        unit TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        affected_recipes JSONB DEFAULT '[]'::jsonb,
        affected_production_items JSONB DEFAULT '[]'::jsonb,
        resolution_status TEXT NOT NULL DEFAULT 'PENDING',
        resolved_by TEXT,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolution_action TEXT,
        resolution_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT shortage_status CHECK (status IN ('MISSING', 'PARTIAL', 'CRITICAL', 'SUFFICIENT')),
        CONSTRAINT shortage_priority CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
        CONSTRAINT shortage_resolution_status CHECK (
          resolution_status IN ('PENDING', 'ACKNOWLEDGED', 'ORDERED', 'RESOLVED', 'CANNOT_FULFILL')
        ),
        CONSTRAINT shortage_resolution_action CHECK (
          resolution_action IS NULL OR 
          resolution_action IN ('ORDERED', 'IN_STOCK_ERROR', 'SUBSTITUTED', 'RESCHEDULED', 'CANCELLED')
        )
      )
    `;
    console.log('✅ ingredient_shortages table created');
    
    // Table 3: ingredient_mappings
    console.log('\n📋 Creating ingredient_mappings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS ingredient_mappings (
        mapping_id TEXT PRIMARY KEY,
        recipe_ingredient_name TEXT NOT NULL UNIQUE,
        inventory_item_name TEXT NOT NULL,
        category TEXT,
        unit_conversion_factor DECIMAL(10, 4) DEFAULT 1.0,
        base_unit TEXT,
        aliases JSONB DEFAULT '[]'::jsonb,
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ ingredient_mappings table created');
    
    // Create indexes for better query performance
    console.log('\n📊 Creating indexes...');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_inventory_checks_schedule 
      ON inventory_checks(schedule_id)
    `;
    console.log('✓ Index on inventory_checks.schedule_id created');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_inventory_checks_date 
      ON inventory_checks(check_date DESC)
    `;
    console.log('✓ Index on inventory_checks.check_date created');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_shortages_check 
      ON ingredient_shortages(check_id)
    `;
    console.log('✓ Index on ingredient_shortages.check_id created');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_shortages_resolution_status 
      ON ingredient_shortages(resolution_status)
    `;
    console.log('✓ Index on ingredient_shortages.resolution_status created');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_shortages_priority 
      ON ingredient_shortages(priority)
    `;
    console.log('✓ Index on ingredient_shortages.priority created');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_shortages_production_date 
      ON ingredient_shortages(production_date)
    `;
    console.log('✓ Index on ingredient_shortages.production_date created');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_mappings_recipe_name 
      ON ingredient_mappings(recipe_ingredient_name)
    `;
    console.log('✓ Index on ingredient_mappings.recipe_ingredient_name created');
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ All tables and indexes created successfully!');
    console.log('═'.repeat(70));
    
    // Show table structures
    console.log('\n📋 Table Structures:\n');
    
    const tables = ['inventory_checks', 'ingredient_shortages', 'ingredient_mappings'];
    for (const table of tables) {
      const result = await sql`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = ${table}
        ORDER BY ordinal_position
      `;
      
      console.log(`\n${table}:`);
      console.log('─'.repeat(70));
      result.forEach(col => {
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        console.log(`   ${col.column_name}: ${col.data_type}${length}`);
      });
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('🎉 Setup complete! Ready to start automated inventory checks.');
    console.log('═'.repeat(70));
    
  } catch (error: any) {
    console.error('\n❌ Error creating tables:', error.message);
    process.exit(1);
  }
}

// Run the migration
createInventoryCheckTables();
