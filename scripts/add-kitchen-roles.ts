import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

config({ path: '.env.local' })

async function addKitchenRoles() {
  console.log('🚀 Adding kitchen roles (head_chef, station_staff) to database...\n')
  
  try {
    // Drop existing constraint
    console.log('📋 Dropping existing role constraint...')
    await sql`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_role_check
    `
    console.log('✓ Dropped existing constraint\n')
    
    // Add new constraint with all roles including kitchen roles
    console.log('📋 Adding new constraint with kitchen roles...')
    await sql`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN (
        'admin', 
        'regional_manager',
        'operations_lead', 
        'dispatcher', 
        'central_kitchen',
        'head_chef',
        'station_staff',
        'branch_manager',
        'branch_staff'
      ) OR role IS NULL)
    `
    console.log('✓ Added new constraint with all roles\n')
    
    console.log('✅ Kitchen roles added successfully!')
    console.log('\n📊 Allowed roles now include:')
    console.log('   - admin')
    console.log('   - regional_manager')
    console.log('   - operations_lead')
    console.log('   - dispatcher')
    console.log('   - central_kitchen')
    console.log('   - head_chef (NEW)')
    console.log('   - station_staff (NEW)')
    console.log('   - branch_manager')
    console.log('   - branch_staff')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

addKitchenRoles()
  .then(() => {
    console.log('\n🎉 Migration complete!')
    process.exit(0)
  })
  .catch(() => {
    console.log('\n💥 Migration failed!')
    process.exit(1)
  })
