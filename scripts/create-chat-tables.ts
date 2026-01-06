import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function createChatTables() {
  console.log('🚀 Creating chat system tables in Postgres...\n')

  try {
    // Step 1: Create chat_channels table
    console.log('📋 Creating chat_channels table...')
    await sql`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_read_only BOOLEAN DEFAULT false,
        icon VARCHAR(50) DEFAULT 'hash',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('✓ chat_channels table created\n')

    // Step 2: Create chat_messages table
    console.log('📋 Creating chat_messages table...')
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        channel_id INTEGER REFERENCES chat_channels(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        is_urgent BOOLEAN DEFAULT false,
        is_pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('✓ chat_messages table created\n')

    // Step 3: Create chat_members table
    console.log('📋 Creating chat_members table...')
    await sql`
      CREATE TABLE IF NOT EXISTS chat_members (
        id SERIAL PRIMARY KEY,
        channel_id INTEGER REFERENCES chat_channels(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_muted BOOLEAN DEFAULT false,
        UNIQUE(channel_id, user_id)
      )
    `
    console.log('✓ chat_members table created\n')

    // Step 4: Create chat_reactions table
    console.log('📋 Creating chat_reactions table...')
    await sql`
      CREATE TABLE IF NOT EXISTS chat_reactions (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES chat_messages(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        emoji VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id, emoji)
      )
    `
    console.log('✓ chat_reactions table created\n')

    // Step 5: Create chat_quick_replies table
    console.log('📋 Creating chat_quick_replies table...')
    await sql`
      CREATE TABLE IF NOT EXISTS chat_quick_replies (
        id SERIAL PRIMARY KEY,
        text VARCHAR(100) NOT NULL,
        emoji VARCHAR(20),
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('✓ chat_quick_replies table created\n')

    // Step 6: Create indexes
    console.log('📋 Creating indexes...')
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id)
    `
    console.log('  ✓ idx_chat_messages_channel_id')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC)
    `
    console.log('  ✓ idx_chat_messages_created_at')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id)
    `
    console.log('  ✓ idx_chat_messages_user_id')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id)
    `
    console.log('  ✓ idx_chat_members_user_id')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_members_channel_id ON chat_members(channel_id)
    `
    console.log('  ✓ idx_chat_members_channel_id')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_reactions_message_id ON chat_reactions(message_id)
    `
    console.log('  ✓ idx_chat_reactions_message_id')

    // Step 7: Insert default channel
    console.log('\n📋 Creating default #general channel...')
    await sql`
      INSERT INTO chat_channels (name, slug, description, icon)
      VALUES ('General', 'general', 'Main chat channel for everyone', 'users')
      ON CONFLICT (slug) DO NOTHING
    `
    console.log('✓ Default #general channel created\n')

    // Step 8: Insert default quick replies
    console.log('📋 Adding default quick replies...')
    const quickReplies = [
      { text: 'On my way!', emoji: '🏃', sort: 1 },
      { text: 'Dispatch received ✅', emoji: '📦', sort: 2 },
      { text: 'Need help!', emoji: '🆘', sort: 3 },
      { text: 'Running low on stock', emoji: '📉', sort: 4 },
      { text: 'All done!', emoji: '✅', sort: 5 },
      { text: 'Thanks!', emoji: '🙏', sort: 6 },
    ]

    for (const reply of quickReplies) {
      await sql`
        INSERT INTO chat_quick_replies (text, emoji, sort_order)
        VALUES (${reply.text}, ${reply.emoji}, ${reply.sort})
        ON CONFLICT DO NOTHING
      `
    }
    console.log('✓ Quick replies added\n')

    console.log('\n✅ All chat tables and indexes created successfully!')
    console.log('\n📊 Tables created:')
    console.log('   - chat_channels (for chat rooms/channels)')
    console.log('   - chat_messages (for messages with image support)')
    console.log('   - chat_members (for channel membership & unread tracking)')
    console.log('   - chat_reactions (for emoji reactions on messages)')
    console.log('   - chat_quick_replies (for quick reply templates)')

  } catch (error) {
    console.error('❌ Table creation failed:', error)
    throw error
  }
}

// Run the migration
createChatTables()
  .then(() => {
    console.log('\n🎉 Chat system database setup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Setup error:', error)
    process.exit(1)
  })

