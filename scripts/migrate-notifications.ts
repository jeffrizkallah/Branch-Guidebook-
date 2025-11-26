import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function migrateNotifications() {
  console.log('🚀 Creating notifications tables...\n')

  try {
    // Create notifications table
    console.log('📋 Creating notifications table...')
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(20) NOT NULL CHECK (type IN ('feature', 'patch', 'alert', 'announcement', 'urgent')),
        priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
        title VARCHAR(255) NOT NULL,
        preview TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
        created_by VARCHAR(100) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true
      )
    `
    console.log('  ✓ notifications table created')

    // Create notification_reads table
    console.log('📋 Creating notification_reads table...')
    await sql`
      CREATE TABLE IF NOT EXISTS notification_reads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
        user_identifier VARCHAR(255) NOT NULL,
        read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(notification_id, user_identifier)
      )
    `
    console.log('  ✓ notification_reads table created')

    // Create indexes
    console.log('📋 Creating indexes...')
    await sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_active 
      ON notifications(is_active, expires_at)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_created 
      ON notifications(created_at DESC)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_notification_reads_user 
      ON notification_reads(user_identifier)
    `
    console.log('  ✓ indexes created')

    // Insert a sample notification
    console.log('\n📥 Inserting sample notification...')
    await sql`
      INSERT INTO notifications (type, priority, title, preview, content, created_by)
      VALUES (
        'feature',
        'normal',
        'Welcome to the Notification System!',
        'We''ve added a new notification system to keep you updated on changes and announcements.',
        '## What''s New

### Added
- **Notification Bell** - Click the bell icon in the top navigation to see all notifications
- **Read/Unread Tracking** - Notifications you haven''t seen will be marked as new
- **Admin Panel** - Administrators can create and manage notifications

### How It Works
- Notifications automatically expire after 7 days
- Click on any notification to see full details
- Mark all as read with a single click

Stay tuned for more updates!',
        'System'
      )
      ON CONFLICT DO NOTHING
    `
    console.log('  ✓ sample notification inserted')

    console.log('\n✅ Migration complete!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migration
migrateNotifications()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error)
    process.exit(1)
  })

