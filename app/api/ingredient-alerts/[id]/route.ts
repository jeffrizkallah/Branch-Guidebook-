import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

const dataFilePath = path.join(process.cwd(), 'data', 'ingredient-alerts.json')

function readAlerts() {
  const fileContents = fs.readFileSync(dataFilePath, 'utf8')
  return JSON.parse(fileContents)
}

function writeAlerts(data: any) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2))
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const alerts = readAlerts()
    const alert = alerts.find((a: any) => a.alertId === params.id)

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    return NextResponse.json(alert)
  } catch (error) {
    console.error('Error reading ingredient alert:', error)
    return NextResponse.json({ error: 'Failed to read ingredient alert' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['admin', 'operations_lead', 'central_kitchen']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates = await request.json()
    const alerts = readAlerts()

    const index = alerts.findIndex((a: any) => a.alertId === params.id)

    if (index === -1) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    const timestamp = new Date().toISOString()

    // Handle status updates
    if (updates.status) {
      alerts[index].status = updates.status

      if (updates.status === 'RESOLVED' || updates.status === 'CANNOT_FULFILL') {
        alerts[index].resolvedBy = session.user.id.toString()
        alerts[index].resolvedByName = session.user.name || session.user.email
        alerts[index].resolvedAt = timestamp
        alerts[index].resolution = updates.resolution || null
        alerts[index].resolutionNotes = updates.resolutionNotes || null
      } else if (updates.status === 'ACKNOWLEDGED') {
        alerts[index].acknowledgedBy = session.user.id.toString()
        alerts[index].acknowledgedAt = timestamp
      }
    }

    // Update missing ingredients status if provided
    if (updates.missingIngredients) {
      alerts[index].missingIngredients = updates.missingIngredients
    }

    // Update notes if provided
    if (updates.notes !== undefined) {
      alerts[index].notes = updates.notes
    }

    writeAlerts(alerts)

    return NextResponse.json(alerts[index])
  } catch (error) {
    console.error('Error updating ingredient alert:', error)
    return NextResponse.json({ error: 'Failed to update ingredient alert' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['admin', 'operations_lead']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const alerts = readAlerts()
    const index = alerts.findIndex((a: any) => a.alertId === params.id)

    if (index === -1) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    const deleted = alerts.splice(index, 1)[0]
    writeAlerts(alerts)

    return NextResponse.json(deleted)
  } catch (error) {
    console.error('Error deleting ingredient alert:', error)
    return NextResponse.json({ error: 'Failed to delete ingredient alert' }, { status: 500 })
  }
}
