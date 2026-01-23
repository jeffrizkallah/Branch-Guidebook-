import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

const dataFilePath = path.join(process.cwd(), 'data', 'ingredient-alerts.json')

function readAlerts() {
  try {
    const fileContents = fs.readFileSync(dataFilePath, 'utf8')
    return JSON.parse(fileContents)
  } catch (error) {
    // If file doesn't exist, return empty array
    return []
  }
}

function writeAlerts(data: any) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2))
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const scheduleId = searchParams.get('scheduleId')

    let alerts = readAlerts()

    // Filter by status if provided
    if (status) {
      alerts = alerts.filter((alert: any) => alert.status === status)
    }

    // Filter by schedule if provided
    if (scheduleId) {
      alerts = alerts.filter((alert: any) => alert.scheduleId === scheduleId)
    }

    // Sort by priority and date (newest first)
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    alerts.sort((a: any, b: any) => {
      const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
    })

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error reading ingredient alerts:', error)
    return NextResponse.json({ error: 'Failed to read ingredient alerts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['admin', 'operations_lead', 'head_chef']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const alertData = await request.json()

    // Validate required fields
    if (!alertData.productionItemId || !alertData.scheduleId || !alertData.recipeName || 
        !alertData.scheduledDate || !alertData.missingIngredients || 
        !Array.isArray(alertData.missingIngredients) || alertData.missingIngredients.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const alerts = readAlerts()

    // Generate alert ID
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toISOString()

    // Determine priority based on scheduled date and number of missing ingredients
    let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
    const scheduledDate = new Date(alertData.scheduledDate)
    const today = new Date()
    const daysUntilProduction = Math.floor((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilProduction <= 1 || alertData.missingIngredients.length >= 5) {
      priority = 'HIGH'
    } else if (daysUntilProduction <= 3) {
      priority = 'MEDIUM'
    } else {
      priority = 'LOW'
    }

    const newAlert = {
      alertId,
      productionItemId: alertData.productionItemId,
      scheduleId: alertData.scheduleId,
      recipeId: alertData.recipeId || null,
      recipeName: alertData.recipeName,
      scheduledDate: alertData.scheduledDate,
      reportedBy: session.user.id.toString(),
      reportedByName: session.user.name || session.user.email,
      reportedAt: timestamp,
      priority,
      status: 'PENDING',
      missingIngredients: alertData.missingIngredients,
      notes: alertData.notes || null
    }

    alerts.push(newAlert)
    writeAlerts(alerts)

    return NextResponse.json(newAlert, { status: 201 })
  } catch (error) {
    console.error('Error creating ingredient alert:', error)
    return NextResponse.json({ error: 'Failed to create ingredient alert' }, { status: 500 })
  }
}
