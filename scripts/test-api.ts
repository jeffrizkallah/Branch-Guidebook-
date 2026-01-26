/**
 * Test the inventory-shortages API endpoint
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function testAPI() {
  try {
    console.log('🧪 Testing /api/inventory-shortages endpoint...\n')
    
    // Import the API route handler
    const { GET } = await import('../app/api/inventory-shortages/route.js')
    
    // Create a mock request
    const url = new URL('http://localhost:3000/api/inventory-shortages?status=PENDING')
    const request = new Request(url)
    
    // Call the handler
    const response = await GET(request as any)
    const data = await response.json()
    
    console.log('📊 API Response:')
    console.log(`Success: ${data.success}`)
    console.log(`Shortages returned: ${data.shortages?.length || 0}`)
    
    if (data.shortages && data.shortages.length > 0) {
      console.log('\n📝 First 3 shortages:')
      data.shortages.slice(0, 3).forEach((shortage: any, i: number) => {
        console.log(`\n${i + 1}. ${shortage.ingredient_name}`)
        console.log(`   Priority: ${shortage.priority}`)
        console.log(`   Status: ${shortage.status}`)
        console.log(`   Resolution: ${shortage.resolution_status}`)
        console.log(`   Required: ${shortage.required_quantity} ${shortage.unit}`)
        console.log(`   Available: ${shortage.available_quantity} ${shortage.unit}`)
      })
    }
    
    if (data.error) {
      console.error('\n❌ API Error:', data.error)
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error)
    throw error
  }
}

// Run test
testAPI()
  .then(() => {
    console.log('\n✅ API test complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ API test failed:', error)
    process.exit(1)
  })
