import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

/**
 * DELETE /api/admin/clear-inventory-checks
 * 
 * Admin endpoint to clear all inventory check records
 * This is useful when you want to reset the inventory checking system
 */
export async function DELETE(request: NextRequest) {
  try {
    // Optional: Add authentication check here
    // For now, anyone can call this endpoint
    
    console.log('🗑️  Clearing all inventory check records...')
    
    // Count records before deletion
    const checksCount = await sql`
      SELECT COUNT(*) as count FROM inventory_checks
    `
    const shortagesCount = await sql`
      SELECT COUNT(*) as count FROM ingredient_shortages
    `
    
    console.log(`Found ${checksCount.rows[0].count} records in inventory_checks`)
    console.log(`Found ${shortagesCount.rows[0].count} records in ingredient_shortages`)
    
    if (checksCount.rows[0].count === '0' && shortagesCount.rows[0].count === '0') {
      return NextResponse.json({
        success: true,
        message: 'No records to delete - tables are already empty',
        deleted: {
          checks: 0,
          shortages: 0
        }
      })
    }
    
    // Delete from ingredient_shortages first (due to foreign key constraint)
    const shortagesResult = await sql`
      DELETE FROM ingredient_shortages
    `
    
    // Delete from inventory_checks
    const checksResult = await sql`
      DELETE FROM inventory_checks
    `
    
    console.log(`✅ Deleted ${checksResult.rowCount} checks and ${shortagesResult.rowCount} shortages`)
    
    return NextResponse.json({
      success: true,
      message: 'All inventory check records have been deleted',
      deleted: {
        checks: checksResult.rowCount,
        shortages: shortagesResult.rowCount
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error clearing inventory checks:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to clear inventory checks' },
      { status: 500 }
    )
  }
}
