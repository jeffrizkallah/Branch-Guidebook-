/**
 * Create branch_inventory table in Neon PostgreSQL
 * 
 * This table stores inventory data from branch Excel files.
 * Run with: npx tsx scripts/create-branch-inventory-table.ts
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

async function createBranchInventoryTable() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log('═'.repeat(60));
  console.log('🏗️  Creating branch_inventory table...');
  console.log('═'.repeat(60));
  
  try {
    // Create the main table
    console.log('\n📋 Creating table structure...');
    await sql`
      CREATE TABLE IF NOT EXISTS branch_inventory (
        id SERIAL PRIMARY KEY,
        inventory_date DATE NOT NULL,
        branch VARCHAR(100) NOT NULL,
        item VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        quantity DECIMAL(10, 2),
        unit VARCHAR(50),
        product_expiry_date DATE,
        unit_cost DECIMAL(10, 2),
        total_cost DECIMAL(10, 2),
        source_file VARCHAR(255),
        last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_branch_inventory UNIQUE (inventory_date, branch, item)
      )
    `;
    console.log('✅ Table created successfully');
    
    // Create indexes for better query performance
    console.log('\n📊 Creating indexes...');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_branch_inventory_branch 
      ON branch_inventory(branch)
    `;
    console.log('✓ Index on branch created');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_branch_inventory_date 
      ON branch_inventory(inventory_date)
    `;
    console.log('✓ Index on inventory_date created');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_branch_inventory_item 
      ON branch_inventory(item)
    `;
    console.log('✓ Index on item created');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_branch_inventory_category 
      ON branch_inventory(category)
    `;
    console.log('✓ Index on category created');
    
    // Check if table was created successfully
    const result = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'branch_inventory'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Table structure:');
    console.log('─'.repeat(60));
    result.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`   ${col.column_name}: ${col.data_type}${length}`);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ branch_inventory table setup complete!');
    console.log('═'.repeat(60));
    
  } catch (error: any) {
    console.error('\n❌ Error creating table:', error.message);
    process.exit(1);
  }
}

// Run the migration
createBranchInventoryTable();
