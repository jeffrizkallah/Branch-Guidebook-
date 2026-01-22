import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

config({ path: '.env.local' })

async function check() {
  // Check what's in the recipes table
  const result = await sql`SELECT recipe_id, recipe_data->>'name' as name FROM recipes WHERE recipe_data->>'name' ILIKE '%brownies%'`
  console.log('Recipes in DB:', result.rows)
  
  // Check exact match query
  const exact = await sql`SELECT recipe_id, recipe_data->>'name' as name FROM recipes WHERE LOWER(recipe_data->>'name') = 'brownies 1 kg' LIMIT 1`
  console.log('Exact match result:', exact.rows)
}

check().then(() => process.exit(0))
