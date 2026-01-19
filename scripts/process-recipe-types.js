/**
 * Process Recipe Types Script
 * 
 * This script runs after the daily Odoo sync to:
 * 1. Assign unique persistent IDs to each distinct item in the odoo_recipe table
 * 2. Flag each ingredient as either a "subrecipe" or "ingredient" based on whether
 *    the ingredient_name exists in the item column
 * 
 * Tables:
 * - recipe_items_lookup: Stores persistent item_id mappings for each unique item name
 * - odoo_recipe: Updated with item_id and item_type columns
 * 
 * Required environment variables:
 * - DATABASE_URL (Neon PostgreSQL connection string)
 */

// Load .env.local for local development
require('dotenv').config({ path: '.env.local' });

const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure Neon to use ws for WebSocket
neonConfig.webSocketConstructor = ws;

// Database pool
let pool;

// Initialize database connection
function initDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
}

// Close database connection
async function closeDatabase() {
  if (pool) {
    await pool.end();
  }
}

// Create the recipe_items_lookup table if it doesn't exist
async function ensureLookupTable() {
  console.log('📋 Ensuring recipe_items_lookup table exists...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipe_items_lookup (
      item_id SERIAL PRIMARY KEY,
      item_name TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  console.log('   ✓ recipe_items_lookup table ready');
}

// Add item_id and item_type columns to odoo_recipe if they don't exist
async function ensureRecipeColumns() {
  console.log('📋 Ensuring odoo_recipe has item_id and item_type columns...');
  
  // Check if columns exist
  const result = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'odoo_recipe' 
    AND column_name IN ('item_id', 'item_type')
  `);
  
  const existingColumns = result.rows.map(r => r.column_name);
  
  if (!existingColumns.includes('item_id')) {
    await pool.query(`ALTER TABLE odoo_recipe ADD COLUMN item_id INTEGER`);
    console.log('   ✓ Added item_id column');
  } else {
    console.log('   ✓ item_id column already exists');
  }
  
  if (!existingColumns.includes('item_type')) {
    await pool.query(`ALTER TABLE odoo_recipe ADD COLUMN item_type TEXT`);
    console.log('   ✓ Added item_type column');
  } else {
    console.log('   ✓ item_type column already exists');
  }
}

// Get all unique items from odoo_recipe and sync with lookup table
async function syncItemIds() {
  console.log('\n🔄 Syncing item IDs...');
  
  // Get all unique items from the recipe table (excluding B&G, CA, HL prefixes)
  const itemsResult = await pool.query(`
    SELECT DISTINCT item 
    FROM odoo_recipe 
    WHERE item IS NOT NULL AND item != ''
      AND item NOT LIKE 'B&G%'
      AND item NOT LIKE 'CA%'
      AND item NOT LIKE 'HL%'
    ORDER BY item
  `);
  
  const uniqueItems = itemsResult.rows.map(r => r.item);
  console.log(`   Found ${uniqueItems.length} unique items in odoo_recipe`);
  
  // Get existing items from lookup table
  const existingResult = await pool.query(`
    SELECT item_name, item_id FROM recipe_items_lookup
  `);
  
  const existingMap = new Map(existingResult.rows.map(r => [r.item_name, r.item_id]));
  console.log(`   Found ${existingMap.size} existing items in lookup table`);
  
  // Find new items that need IDs
  const newItems = uniqueItems.filter(item => !existingMap.has(item));
  
  if (newItems.length > 0) {
    console.log(`   Adding ${newItems.length} new items to lookup table...`);
    
    // Insert new items in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
      const batch = newItems.slice(i, i + BATCH_SIZE);
      const values = batch.map((item, idx) => `($${idx + 1})`).join(', ');
      await pool.query(
        `INSERT INTO recipe_items_lookup (item_name) VALUES ${values} ON CONFLICT (item_name) DO NOTHING`,
        batch
      );
    }
    
    console.log(`   ✓ Added ${newItems.length} new items`);
  } else {
    console.log('   ✓ No new items to add');
  }
  
  // Return the complete lookup map (refresh after inserts)
  const finalResult = await pool.query(`
    SELECT item_name, item_id FROM recipe_items_lookup
  `);
  
  return new Map(finalResult.rows.map(r => [r.item_name, r.item_id]));
}

// Update odoo_recipe with item_id values
async function updateItemIds() {
  console.log('\n🔄 Updating item_id values in odoo_recipe...');
  
  // Update all rows with their corresponding item_id (excluding B&G, CA, HL prefixes)
  const updateResult = await pool.query(`
    UPDATE odoo_recipe r
    SET item_id = l.item_id
    FROM recipe_items_lookup l
    WHERE r.item = l.item_name
      AND r.item NOT LIKE 'B&G%'
      AND r.item NOT LIKE 'CA%'
      AND r.item NOT LIKE 'HL%'
  `);
  
  console.log(`   ✓ Updated ${updateResult.rowCount} rows with item_id`);
}

// Update item_type based on whether ingredient_name exists in items
async function updateItemTypes() {
  console.log('\n🔄 Updating item_type values in odoo_recipe...');
  
  // Update item_type for all rows (excluding B&G, CA, HL prefixes):
  // - If ingredient_name exists in the item column -> 'subrecipe'
  // - Otherwise -> 'ingredient'
  const updateResult = await pool.query(`
    UPDATE odoo_recipe r
    SET item_type = CASE 
      WHEN EXISTS (
        SELECT 1 FROM recipe_items_lookup l 
        WHERE l.item_name = r.ingredient_name
      ) THEN 'subrecipe'
      ELSE 'ingredient'
    END
    WHERE r.item NOT LIKE 'B&G%'
      AND r.item NOT LIKE 'CA%'
      AND r.item NOT LIKE 'HL%'
  `);
  
  console.log(`   ✓ Updated ${updateResult.rowCount} rows with item_type`);
  
  // Get counts for summary
  const countsResult = await pool.query(`
    SELECT item_type, COUNT(*) as count 
    FROM odoo_recipe 
    WHERE item_type IS NOT NULL
    GROUP BY item_type
  `);
  
  for (const row of countsResult.rows) {
    console.log(`   - ${row.item_type}: ${parseInt(row.count).toLocaleString()} rows`);
  }
}

// Main function
async function main() {
  console.log('═'.repeat(60));
  console.log('🍳 RECIPE TYPE PROCESSOR');
  console.log('═'.repeat(60));
  console.log(`   Started: ${new Date().toISOString()}`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    initDatabase();
    
    // Step 1: Ensure lookup table exists
    await ensureLookupTable();
    
    // Step 2: Ensure odoo_recipe has the required columns
    await ensureRecipeColumns();
    
    // Step 3: Sync item IDs (add new items, get complete mapping)
    const itemIdMap = await syncItemIds();
    
    // Step 4: Update item_id in odoo_recipe
    await updateItemIds();
    
    // Step 5: Update item_type in odoo_recipe
    await updateItemTypes();
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 PROCESSING COMPLETE');
    console.log('═'.repeat(60));
    console.log(`   Duration: ${duration} seconds`);
    console.log(`   Unique items tracked: ${itemIdMap.size}`);
    console.log(`   Completed: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.log('\n' + '═'.repeat(60));
    console.log('❌ PROCESSING FAILED');
    console.log('═'.repeat(60));
    console.log(`   Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
