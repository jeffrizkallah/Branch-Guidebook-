import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function createQualityFieldConfigTable() {
  console.log('🚀 Creating quality_check_field_config table in Postgres...\n')

  try {
    // ==========================================
    // QUALITY CHECK FIELD CONFIG TABLE
    // ==========================================
    console.log('📋 Creating quality_check_field_config table...')
    await sql`
      CREATE TABLE IF NOT EXISTS quality_check_field_config (
        id SERIAL PRIMARY KEY,
        field_key VARCHAR(100) NOT NULL UNIQUE,
        label VARCHAR(255) NOT NULL,
        field_type VARCHAR(50) NOT NULL, -- 'rating', 'number', 'text', 'textarea', 'checkbox', 'select'
        is_required BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        options JSONB, -- For select fields, store options here { "options": ["Option1", "Option2"] }
        min_value DECIMAL, -- For number/rating fields
        max_value DECIMAL, -- For number/rating fields
        placeholder VARCHAR(255),
        notes_enabled BOOLEAN DEFAULT false, -- Whether to show a notes field alongside this field
        section VARCHAR(50) DEFAULT 'custom', -- 'core' for built-in fields, 'custom' for user-added
        icon VARCHAR(50), -- lucide icon name
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('✓ quality_check_field_config table created\n')

    // Create indexes
    console.log('📋 Creating indexes...')
    await sql`CREATE INDEX IF NOT EXISTS idx_field_config_active ON quality_check_field_config(is_active)`
    console.log('  ✓ idx_field_config_active')
    
    await sql`CREATE INDEX IF NOT EXISTS idx_field_config_sort ON quality_check_field_config(sort_order)`
    console.log('  ✓ idx_field_config_sort')

    // Add custom_fields column to quality_checks table if it doesn't exist
    console.log('\n📋 Adding custom_fields column to quality_checks table...')
    await sql`
      ALTER TABLE quality_checks 
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb
    `
    console.log('✓ custom_fields column added\n')

    // Insert default/core fields
    console.log('📋 Inserting default field configurations...')
    
    const defaultFields = [
      { key: 'taste_score', label: 'Taste Score', type: 'rating', required: true, order: 1, min: 1, max: 5, notes: true, section: 'core', icon: 'Star' },
      { key: 'appearance_score', label: 'Appearance Score', type: 'rating', required: true, order: 2, min: 1, max: 5, notes: true, section: 'core', icon: 'Eye' },
      { key: 'portion_qty_gm', label: 'Portion Size (grams)', type: 'number', required: true, order: 3, min: 0, max: 10000, notes: true, section: 'core', icon: 'Scale', placeholder: 'e.g., 250' },
      { key: 'temp_celsius', label: 'Temperature (°C)', type: 'number', required: true, order: 4, min: -50, max: 200, notes: false, section: 'core', icon: 'Thermometer', placeholder: 'e.g., 65' },
    ]

    for (const field of defaultFields) {
      await sql`
        INSERT INTO quality_check_field_config (
          field_key, label, field_type, is_required, is_active, sort_order,
          min_value, max_value, notes_enabled, section, icon, placeholder
        ) VALUES (
          ${field.key}, ${field.label}, ${field.type}, ${field.required}, true, ${field.order},
          ${field.min}, ${field.max}, ${field.notes}, ${field.section}, ${field.icon}, ${field.placeholder || null}
        )
        ON CONFLICT (field_key) DO NOTHING
      `
      console.log(`  ✓ ${field.label}`)
    }

    console.log('\n═'.repeat(50))
    console.log('✅ Quality check field config table created successfully!')
    console.log('═'.repeat(50))
    console.log('\n📊 Tables updated:')
    console.log('   - quality_check_field_config (new)')
    console.log('   - quality_checks (added custom_fields column)')
    console.log('\n📊 Default fields added:')
    defaultFields.forEach(f => console.log(`   - ${f.label}`))

  } catch (error) {
    console.error('❌ Table creation failed:', error)
    throw error
  }
}

// Run the migration
createQualityFieldConfigTable()
  .then(() => {
    console.log('\n🎉 Quality field config database setup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Setup error:', error)
    process.exit(1)
  })


