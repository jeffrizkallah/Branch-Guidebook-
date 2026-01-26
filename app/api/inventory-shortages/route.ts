import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

/**
 * GET /api/inventory-shortages
 * 
 * Get pending inventory shortages for Central Kitchen
 * Query params: scheduleId, status, priority
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const scheduleId = searchParams.get('scheduleId')
    const status = searchParams.get('status') || 'PENDING'
    const priority = searchParams.get('priority')
    
    console.log('API Request params:', { scheduleId, status, priority })
    
    // Build query based on filters
    let result
    
    // Determine base query based on status
    if (status === 'PENDING') {
      // For PENDING, include both explicit 'PENDING' and NULL values
      if (scheduleId && priority) {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          WHERE (s.resolution_status = 'PENDING' OR s.resolution_status IS NULL)
            AND s.schedule_id = ${scheduleId}
            AND s.priority = ${priority}
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      } else if (scheduleId) {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          WHERE (s.resolution_status = 'PENDING' OR s.resolution_status IS NULL)
            AND s.schedule_id = ${scheduleId}
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      } else if (priority) {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          WHERE (s.resolution_status = 'PENDING' OR s.resolution_status IS NULL)
            AND s.priority = ${priority}
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      } else {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          WHERE (s.resolution_status = 'PENDING' OR s.resolution_status IS NULL)
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      }
    } else if (status === 'ALL') {
      // For ALL, don't filter by resolution_status
      if (scheduleId && priority) {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          WHERE s.schedule_id = ${scheduleId} AND s.priority = ${priority}
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      } else if (scheduleId) {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          WHERE s.schedule_id = ${scheduleId}
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      } else if (priority) {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          WHERE s.priority = ${priority}
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      } else {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      }
    } else {
      // For specific status (e.g., RESOLVED)
      if (scheduleId && priority) {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          WHERE s.resolution_status = ${status}
            AND s.schedule_id = ${scheduleId}
            AND s.priority = ${priority}
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      } else if (scheduleId) {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          WHERE s.resolution_status = ${status}
            AND s.schedule_id = ${scheduleId}
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      } else if (priority) {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          WHERE s.resolution_status = ${status}
            AND s.priority = ${priority}
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      } else {
        result = await sql`
          SELECT s.*, c.check_date, c.overall_status
          FROM ingredient_shortages s
          JOIN inventory_checks c ON s.check_id = c.check_id
          WHERE s.resolution_status = ${status}
          ORDER BY CASE s.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, s.created_at DESC
        `
      }
    }
    
    console.log('API Response:', { count: result.rows.length })
    
    return NextResponse.json({
      success: true,
      shortages: result.rows
    })
    
  } catch (error: any) {
    console.error('Error getting inventory shortages:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get shortages' },
      { status: 500 }
    )
  }
}
