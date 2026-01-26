/**
 * Wrapper script to run migrations with environment variables loaded
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Now run the migration
import('./fix-shortage-resolution-status.js')
  .catch(async () => {
    // If .js doesn't exist, try running the .ts file directly
    const { default: tsNodeRegister } = await import('tsx/esm/api')
    await import('./fix-shortage-resolution-status.ts')
  })
