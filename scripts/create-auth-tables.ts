import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function createAuthTables() {
  console.log('🚀 Creating authentication tables in Postgres...\n')

  try {
    // Step 1: Create users table
    console.log('📋 Creating users table...')
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        nationality VARCHAR(100),
        phone VARCHAR(50),
        role VARCHAR(50) CHECK (role IN (
          'admin', 
          'regional_manager',
          'operations_lead', 
          'dispatcher', 
          'central_kitchen', 
          'branch_manager',
          'branch_staff'
        )),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected')),
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP WITH TIME ZONE,
        rejected_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      )
    `
    console.log('✓ users table created\n')

    // Step 2: Create user_branch_access table
    console.log('📋 Creating user_branch_access table...')
    await sql`
      CREATE TABLE IF NOT EXISTS user_branch_access (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        branch_slug VARCHAR(100) NOT NULL,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        assigned_by INTEGER REFERENCES users(id),
        UNIQUE(user_id, branch_slug)
      )
    `
    console.log('✓ user_branch_access table created\n')

    // Step 3: Create password_reset_tokens table
    console.log('📋 Creating password_reset_tokens table...')
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        created_by INTEGER REFERENCES users(id),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('✓ password_reset_tokens table created\n')

    // Step 4: Create indexes
    console.log('📋 Creating indexes...')
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `
    console.log('  ✓ idx_users_email')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)
    `
    console.log('  ✓ idx_users_status')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
    `
    console.log('  ✓ idx_users_role')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_branch_access_user_id ON user_branch_access(user_id)
    `
    console.log('  ✓ idx_user_branch_access_user_id')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_branch_access_branch_slug ON user_branch_access(branch_slug)
    `
    console.log('  ✓ idx_user_branch_access_branch_slug')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)
    `
    console.log('  ✓ idx_password_reset_tokens_token')

    console.log('\n✅ All authentication tables and indexes created successfully!')
    console.log('\n📊 Tables created:')
    console.log('   - users (for user accounts and authentication)')
    console.log('   - user_branch_access (for branch manager assignments)')
    console.log('   - password_reset_tokens (for admin-initiated password resets)')

  } catch (error) {
    console.error('❌ Table creation failed:', error)
    throw error
  }
}

// Run the migration
createAuthTables()
  .then(() => {
    console.log('\n🎉 Authentication database setup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Setup error:', error)
    process.exit(1)
  })

