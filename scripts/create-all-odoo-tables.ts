import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function createAllOdooTables() {
  console.log('🚀 Creating all Odoo sync tables in Postgres...\n')

  try {
    // ==========================================
    // INVENTORY TABLE
    // ==========================================
    console.log('📋 Creating odoo_inventory table...')
    await sql`
      CREATE TABLE IF NOT EXISTS odoo_inventory (
        id SERIAL PRIMARY KEY,
        product VARCHAR(255),
        location VARCHAR(255),
        lot_serial VARCHAR(100),
        number VARCHAR(100),
        removal_date DATE,
        inventoried_quantity DECIMAL(12, 3),
        available_quantity DECIMAL(12, 3),
        unit_of_measure VARCHAR(50),
        value DECIMAL(12, 2),
        company VARCHAR(255),
        date DATE,
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_inventory_product ON odoo_inventory(product)`
    await sql`CREATE INDEX IF NOT EXISTS idx_inventory_location ON odoo_inventory(location)`
    await sql`CREATE INDEX IF NOT EXISTS idx_inventory_date ON odoo_inventory(date)`
    console.log('✓ odoo_inventory table created\n')

    // ==========================================
    // MANUFACTURING TABLE
    // ==========================================
    console.log('📋 Creating odoo_manufacturing table...')
    await sql`
      CREATE TABLE IF NOT EXISTS odoo_manufacturing (
        id SERIAL PRIMARY KEY,
        scheduled_date DATE,
        reference VARCHAR(100),
        product VARCHAR(255),
        product_unit_of_measure VARCHAR(50),
        quantity_to_produce DECIMAL(12, 3),
        company VARCHAR(255),
        state VARCHAR(50),
        barcode VARCHAR(100),
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_manufacturing_scheduled_date ON odoo_manufacturing(scheduled_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_manufacturing_product ON odoo_manufacturing(product)`
    await sql`CREATE INDEX IF NOT EXISTS idx_manufacturing_state ON odoo_manufacturing(state)`
    await sql`CREATE INDEX IF NOT EXISTS idx_manufacturing_barcode ON odoo_manufacturing(barcode)`
    console.log('✓ odoo_manufacturing table created\n')

    // ==========================================
    // PURCHASE TABLE
    // ==========================================
    console.log('📋 Creating odoo_purchase table...')
    await sql`
      CREATE TABLE IF NOT EXISTS odoo_purchase (
        id SERIAL PRIMARY KEY,
        purchase_date DATE,
        branch VARCHAR(100),
        items TEXT,
        categories VARCHAR(100),
        supplier VARCHAR(255),
        qty_purchased DECIMAL(12, 3),
        purchase_unit VARCHAR(50),
        cost DECIMAL(12, 2),
        total DECIMAL(12, 2),
        check_number VARCHAR(100),
        vat DECIMAL(12, 2),
        month VARCHAR(50),
        barcode VARCHAR(100),
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_purchase_date ON odoo_purchase(purchase_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_purchase_branch ON odoo_purchase(branch)`
    await sql`CREATE INDEX IF NOT EXISTS idx_purchase_supplier ON odoo_purchase(supplier)`
    await sql`CREATE INDEX IF NOT EXISTS idx_purchase_categories ON odoo_purchase(categories)`
    await sql`CREATE INDEX IF NOT EXISTS idx_purchase_barcode ON odoo_purchase(barcode)`
    console.log('✓ odoo_purchase table created\n')

    // ==========================================
    // RECIPE TABLE
    // ==========================================
    console.log('📋 Creating odoo_recipe table...')
    await sql`
      CREATE TABLE IF NOT EXISTS odoo_recipe (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100),
        product_group VARCHAR(100),
        item VARCHAR(255),
        ingredient_name VARCHAR(255),
        quantity DECIMAL(12, 3),
        unit VARCHAR(50),
        unit_cost DECIMAL(12, 4),
        ingredient_total_cost DECIMAL(12, 4),
        recipe_total_cost DECIMAL(12, 4),
        notes TEXT,
        barcode VARCHAR(100),
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_recipe_category ON odoo_recipe(category)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recipe_product_group ON odoo_recipe(product_group)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recipe_item ON odoo_recipe(item)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recipe_ingredient ON odoo_recipe(ingredient_name)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recipe_barcode ON odoo_recipe(barcode)`
    console.log('✓ odoo_recipe table created\n')

    // ==========================================
    // TRANSFER TABLE
    // ==========================================
    console.log('📋 Creating odoo_transfer table...')
    await sql`
      CREATE TABLE IF NOT EXISTS odoo_transfer (
        id SERIAL PRIMARY KEY,
        effective_date DATE,
        scheduled_date DATE,
        from_branch VARCHAR(100),
        to_branch VARCHAR(100),
        items TEXT,
        category VARCHAR(100),
        product_group VARCHAR(100),
        quantity DECIMAL(12, 3),
        cost DECIMAL(12, 2),
        barcode VARCHAR(100),
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_transfer_effective_date ON odoo_transfer(effective_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_transfer_from_branch ON odoo_transfer(from_branch)`
    await sql`CREATE INDEX IF NOT EXISTS idx_transfer_to_branch ON odoo_transfer(to_branch)`
    await sql`CREATE INDEX IF NOT EXISTS idx_transfer_barcode ON odoo_transfer(barcode)`
    console.log('✓ odoo_transfer table created\n')

    // ==========================================
    // WASTE TABLE
    // ==========================================
    console.log('📋 Creating odoo_waste table...')
    await sql`
      CREATE TABLE IF NOT EXISTS odoo_waste (
        id SERIAL PRIMARY KEY,
        date DATE,
        branch VARCHAR(100),
        item TEXT,
        category VARCHAR(100),
        product_group VARCHAR(100),
        quantity DECIMAL(12, 3),
        unit VARCHAR(50),
        cost DECIMAL(12, 2),
        reason TEXT,
        barcode VARCHAR(100),
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_waste_date ON odoo_waste(date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_waste_branch ON odoo_waste(branch)`
    await sql`CREATE INDEX IF NOT EXISTS idx_waste_category ON odoo_waste(category)`
    await sql`CREATE INDEX IF NOT EXISTS idx_waste_reason ON odoo_waste(reason)`
    await sql`CREATE INDEX IF NOT EXISTS idx_waste_barcode ON odoo_waste(barcode)`
    console.log('✓ odoo_waste table created\n')

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('═'.repeat(50))
    console.log('✅ All Odoo tables created successfully!')
    console.log('═'.repeat(50))
    console.log('\n📊 Tables created:')
    console.log('   - odoo_inventory')
    console.log('   - odoo_manufacturing')
    console.log('   - odoo_purchase')
    console.log('   - odoo_recipe')
    console.log('   - odoo_transfer')
    console.log('   - odoo_waste')
    console.log('\n(odoo_sales and sync_logs already exist from previous setup)')

  } catch (error) {
    console.error('❌ Table creation failed:', error)
    throw error
  }
}

// Run the migration
createAllOdooTables()
  .then(() => {
    console.log('\n🎉 Database setup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Setup error:', error)
    process.exit(1)
  })

