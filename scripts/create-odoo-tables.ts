import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function createOdooTables() {
  console.log('🚀 Creating Odoo sync tables in Postgres...\n')

  try {
    // Step 1: Create sync_logs table for tracking sync operations
    console.log('📋 Creating sync_logs table...')
    await sql`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        file_name VARCHAR(100) NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        rows_processed INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'running',
        error_message TEXT,
        CONSTRAINT sync_logs_status_check CHECK (status IN ('running', 'success', 'failed'))
      )
    `
    console.log('✓ sync_logs table created\n')

    // Step 2: Create odoo_sales table
    console.log('📋 Creating odoo_sales table...')
    await sql`
      CREATE TABLE IF NOT EXISTS odoo_sales (
        id SERIAL PRIMARY KEY,
        
        -- Order info
        order_number VARCHAR(100),
        order_type VARCHAR(50),
        invoice_number VARCHAR(100),
        
        -- Location & Time
        branch VARCHAR(100),
        date DATE,
        month VARCHAR(50),
        
        -- Client
        client VARCHAR(255),
        
        -- Product info
        items TEXT,
        barcode VARCHAR(100),
        category VARCHAR(100),
        product_group VARCHAR(100),
        
        -- Quantities & Pricing
        qty DECIMAL(12, 3),
        unit_of_measure VARCHAR(50),
        unit_price DECIMAL(12, 2),
        price_subtotal DECIMAL(12, 2),
        tax DECIMAL(12, 2),
        price_subtotal_with_tax DECIMAL(12, 2),
        
        -- Metadata
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('✓ odoo_sales table created\n')

    // Step 3: Create indexes for common queries
    console.log('📋 Creating indexes...')
    
    // Index on date for time-based queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_odoo_sales_date ON odoo_sales(date)
    `
    console.log('  ✓ idx_odoo_sales_date')
    
    // Index on branch for branch filtering
    await sql`
      CREATE INDEX IF NOT EXISTS idx_odoo_sales_branch ON odoo_sales(branch)
    `
    console.log('  ✓ idx_odoo_sales_branch')
    
    // Index on order_number for lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_odoo_sales_order_number ON odoo_sales(order_number)
    `
    console.log('  ✓ idx_odoo_sales_order_number')
    
    // Index on category for category filtering
    await sql`
      CREATE INDEX IF NOT EXISTS idx_odoo_sales_category ON odoo_sales(category)
    `
    console.log('  ✓ idx_odoo_sales_category')
    
    // Index on month for monthly reports
    await sql`
      CREATE INDEX IF NOT EXISTS idx_odoo_sales_month ON odoo_sales(month)
    `
    console.log('  ✓ idx_odoo_sales_month')
    
    // Composite index for branch + date queries (common pattern)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_odoo_sales_branch_date ON odoo_sales(branch, date)
    `
    console.log('  ✓ idx_odoo_sales_branch_date')

    console.log('\n✅ All Odoo tables and indexes created successfully!')
    console.log('\n📊 Tables created:')
    console.log('   - sync_logs (for tracking sync operations)')
    console.log('   - odoo_sales (for sales data from Odoo)')
    console.log('\n📊 Indexes created:')
    console.log('   - idx_odoo_sales_date')
    console.log('   - idx_odoo_sales_branch')
    console.log('   - idx_odoo_sales_order_number')
    console.log('   - idx_odoo_sales_category')
    console.log('   - idx_odoo_sales_month')
    console.log('   - idx_odoo_sales_branch_date')

  } catch (error) {
    console.error('❌ Table creation failed:', error)
    throw error
  }
}

// Run the migration
createOdooTables()
  .then(() => {
    console.log('\n🎉 Database setup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Setup error:', error)
    process.exit(1)
  })

