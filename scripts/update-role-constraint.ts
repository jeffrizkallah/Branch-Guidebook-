import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function updateRoleConstraint() {
  console.log('🚀 Updating role constraint in users table...\n')

  try {
    // Step 1: Find and drop the existing CHECK constraint on the role column
    console.log('📋 Finding existing role constraint...')
    
    const constraints = await sql`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass 
      AND contype = 'c' 
      AND pg_get_constraintdef(oid) LIKE '%role%'
    `
    
    if (constraints.rows.length > 0) {
      for (const constraint of constraints.rows) {
        console.log(`  Dropping constraint: ${constraint.conname}`)
        await sql.query(`ALTER TABLE users DROP CONSTRAINT ${constraint.conname}`)
      }
      console.log('✓ Old role constraint(s) dropped\n')
    } else {
      console.log('  No existing role constraint found (might be embedded in column)\n')
    }

    // Step 2: Add the new CHECK constraint with all roles
    console.log('📋 Adding new role constraint with all roles...')
    await sql`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN (
        'admin', 
        'regional_manager',
        'operations_lead', 
        'dispatcher', 
        'central_kitchen', 
        'branch_manager',
        'branch_staff'
      ) OR role IS NULL)
    `
    console.log('✓ New role constraint added\n')

    console.log('✅ Role constraint updated successfully!')
    console.log('\n📊 Allowed roles now include:')
    console.log('   - admin')
    console.log('   - regional_manager')
    console.log('   - operations_lead')
    console.log('   - dispatcher')
    console.log('   - central_kitchen')
    console.log('   - branch_manager')
    console.log('   - branch_staff')

  } catch (error) {
    console.error('❌ Constraint update failed:', error)
    throw error
  }
}

// Run the migration
updateRoleConstraint()
  .then(() => {
    console.log('\n🎉 Role constraint update complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Update error:', error)
    process.exit(1)
  })
