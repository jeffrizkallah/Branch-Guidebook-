# 📍 Geolocation-Based Attendance Tracking System

**Version:** 1.0  
**Date:** January 22, 2026  
**Status:** Design Complete - Ready for Implementation

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [How It Works](#how-it-works)
4. [Technical Architecture](#technical-architecture)
5. [Database Schema](#database-schema)
6. [UI/UX Design](#uiux-design)
7. [API Endpoints](#api-endpoints)
8. [Security & Anti-Cheating](#security--anti-cheating)
9. [Legal Compliance (UAE)](#legal-compliance-uae)
10. [Implementation Phases](#implementation-phases)
11. [Testing Strategy](#testing-strategy)
12. [Edge Cases & Solutions](#edge-cases--solutions)

---

## 🎯 OVERVIEW

### Purpose
Implement a geolocation-based attendance tracking system that verifies employees are physically present at their assigned branch when clocking in and out.

### Key Features
- ✅ **Location Verification:** GPS-based check-in/out only when at branch
- ✅ **No Continuous Tracking:** Only checks location at clock-in/out moments
- ✅ **Multi-Branch Support:** Works across all 14 Mikana locations
- ✅ **Manager Dashboard:** Real-time attendance monitoring
- ✅ **Regional Overview:** Cross-branch attendance analytics
- ✅ **Manual Override:** Managers can manually mark attendance if needed
- ✅ **Mobile-First:** Optimized for staff using phones
- ✅ **Browser-Based:** No app installation required

### Benefits
- Prevents remote clock-ins (staff must be at branch)
- Accurate time tracking for payroll
- Real-time attendance visibility
- Automated late detection
- Compliance with UAE labor law

---

## 🔧 SYSTEM REQUIREMENTS

### Technical Requirements
- **Frontend:** Next.js 14+ with React
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Vercel Postgres)
- **Authentication:** NextAuth.js (existing system)
- **Geolocation:** Browser Geolocation API
- **SSL:** HTTPS required (already have on mikana.app)

### Browser Support
- ✅ Chrome (Desktop & Mobile)
- ✅ Safari (Desktop & iOS)
- ✅ Firefox (Desktop & Mobile)
- ✅ Edge (Desktop & Mobile)
- ✅ Samsung Internet (Mobile)

### Device Requirements
- **Mobile:** GPS-enabled smartphone (primary use case)
- **Desktop:** WiFi-based location (less accurate, for managers)
- **Permissions:** Location access required

---

## 🔄 HOW IT WORKS

### Staff Clock-In Flow

```
1. Staff arrives at branch (e.g., ISC Soufouh at 7:00 AM)
   ↓
2. Opens mikana.app on phone
   ↓
3. Navigates to "Attendance" section
   ↓
4. App requests location (browser prompt appears first time)
   ↓
5. Staff clicks "Allow"
   ↓
6. App detects location: "You're at ISC Soufouh ✓"
   ↓
7. Green "CLOCK IN" button appears
   ↓
8. Staff taps button
   ↓
9. System verifies:
   - Location within 150m of branch ✓
   - User has access to this branch ✓
   - Not already clocked in ✓
   ↓
10. ✓ Success: "Clocked in at 7:02 AM"
    ↓
11. Manager receives notification
```

### Staff Clock-Out Flow

```
1. Staff ready to leave (3:00 PM)
   ↓
2. Opens app
   ↓
3. App verifies still at branch location
   ↓
4. Taps "CLOCK OUT" button
   ↓
5. System calculates total hours worked
   ↓
6. ✓ Success: "Clocked out at 3:05 PM. Total: 8h 03m"
   ↓
7. Record saved to database
```

### Prevented Scenarios

**Scenario 1: Trying to clock in from home**
```
Staff at home → Opens app → App detects: "15.3 km from branch"
→ Shows error: "You must be at the branch to clock in"
→ Clock-in button disabled
```

**Scenario 2: Trying to clock out after leaving**
```
Staff left branch → Tries to clock out from bus
→ App detects: "Outside branch area"
→ Shows error: "You must be at the branch to clock out"
→ Must contact manager for manual adjustment
```

---

## 🏗️ TECHNICAL ARCHITECTURE

### System Components

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Staff Mobile UI          Manager Dashboard         │
│  ├─ Clock In/Out         ├─ Live Attendance View   │
│  ├─ Location Detection   ├─ Manual Entry Form      │
│  ├─ History View         ├─ Reports Export         │
│  └─ Week Summary         └─ Alerts Management      │
│                                                      │
│  Regional Dashboard                                 │
│  ├─ Multi-Branch Overview                          │
│  ├─ Analytics & Trends                             │
│  └─ Compliance Reports                             │
│                                                      │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                     API LAYER                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  /api/attendance/clock-in                          │
│  /api/attendance/clock-out                         │
│  /api/attendance/status                            │
│  /api/attendance/history                           │
│  /api/attendance/manual-entry                      │
│  /api/attendance/reports                           │
│  /api/attendance/geofences                         │
│                                                      │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                   DATABASE LAYER                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  • attendance_records                               │
│  • branch_geofences                                 │
│  • staff_schedules (optional)                       │
│  • attendance_alerts                                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Geolocation Logic

```typescript
// Core distance calculation using Haversine formula
function calculateDistance(
  lat1: number, 
  lon1: number,
  lat2: number, 
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Check if user is within branch geofence
function isWithinBranch(
  userLat: number,
  userLon: number,
  branchLat: number,
  branchLon: number,
  radiusMeters: number = 150
): boolean {
  const distance = calculateDistance(
    userLat, userLon, 
    branchLat, branchLon
  );
  return distance <= radiusMeters;
}

// Find which branch user is at (if any)
function detectBranch(
  userLat: number, 
  userLon: number,
  branches: Branch[]
): Branch | null {
  for (const branch of branches) {
    if (isWithinBranch(
      userLat, userLon,
      branch.latitude, branch.longitude,
      branch.geofenceRadius || 150
    )) {
      return branch;
    }
  }
  return null; // Not at any branch
}
```

### Browser Geolocation API Usage

```typescript
// Request location with high accuracy
async function getUserLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        switch(error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location unavailable'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timeout'));
            break;
        }
      },
      {
        enableHighAccuracy: true,  // Use GPS
        timeout: 15000,            // 15 second timeout
        maximumAge: 0              // No cached location
      }
    );
  });
}

// Check permission status
async function checkLocationPermission(): Promise<PermissionState> {
  try {
    const result = await navigator.permissions.query({ 
      name: 'geolocation' 
    });
    return result.state; // 'granted', 'prompt', or 'denied'
  } catch {
    return 'prompt'; // Fallback for older browsers
  }
}
```

---

## 💾 DATABASE SCHEMA

### attendance_records Table

```sql
CREATE TABLE attendance_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  branch_slug VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  
  -- Clock in/out times
  clock_in_time TIMESTAMP NOT NULL,
  clock_out_time TIMESTAMP,
  
  -- Status
  status VARCHAR(20) NOT NULL, 
    -- Values: 'present', 'late', 'absent', 'half_day'
  minutes_late INTEGER DEFAULT 0,
  
  -- Verification data
  clock_in_location JSONB NOT NULL, 
    -- Format: {"lat": 25.0894, "lng": 55.1623, "accuracy": 12}
  clock_out_location JSONB,
  clock_in_accuracy DECIMAL(8, 2), -- GPS accuracy in meters
  clock_out_accuracy DECIMAL(8, 2),
  
  -- Device info (for security)
  device_info JSONB,
    -- Format: {"userAgent": "...", "deviceId": "..."}
  
  -- Hours tracking
  total_hours DECIMAL(5, 2),
  break_minutes INTEGER DEFAULT 0,
  
  -- Manual overrides
  manually_edited BOOLEAN DEFAULT false,
  edited_by INTEGER REFERENCES users(id),
  edit_reason TEXT,
  edit_timestamp TIMESTAMP,
  
  -- Security flags
  flags TEXT[], -- e.g., ['edge_clock_in', 'low_accuracy']
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CONSTRAINT attendance_date_check CHECK (date <= CURRENT_DATE),
  CONSTRAINT attendance_hours_check CHECK (total_hours >= 0 AND total_hours <= 24)
);

-- Indexes for performance
CREATE INDEX idx_attendance_user_date ON attendance_records(user_id, date);
CREATE INDEX idx_attendance_branch_date ON attendance_records(branch_slug, date);
CREATE INDEX idx_attendance_status ON attendance_records(status);
CREATE INDEX idx_attendance_clock_in ON attendance_records(clock_in_time);
```

### branch_geofences Table

```sql
CREATE TABLE branch_geofences (
  id SERIAL PRIMARY KEY,
  branch_slug VARCHAR(50) UNIQUE NOT NULL,
  
  -- GPS coordinates
  center_latitude DECIMAL(10, 8) NOT NULL,
  center_longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 150,
  
  -- Validation
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  address TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_latitude CHECK (
    center_latitude >= -90 AND center_latitude <= 90
  ),
  CONSTRAINT valid_longitude CHECK (
    center_longitude >= -180 AND center_longitude <= 180
  ),
  CONSTRAINT valid_radius CHECK (
    radius_meters > 0 AND radius_meters <= 1000
  )
);

-- Initial data for branches
INSERT INTO branch_geofences (branch_slug, center_latitude, center_longitude, radius_meters) VALUES
  ('central-kitchen', 25.1124, 55.2004, 200),  -- Larger facility
  ('isc-soufouh', 25.0894, 55.1623, 150),
  ('isc-dip', 25.0164, 55.1714, 150),
  ('isc-sharja', 25.3463, 55.4209, 150),
  ('isc-rak', 25.7897, 55.9433, 150),
  ('isc-aljada', 25.3058, 55.4667, 150),
  ('isc-ajman', 25.4052, 55.5136, 150),
  ('isc-ueq', 25.5647, 55.5548, 150),
  ('sabis-yas', 24.4539, 54.6110, 150),
  ('isc-khalifa', 24.4539, 54.6477, 150),
  ('isc-ain', 24.2075, 55.7447, 150),
  ('bateen', 24.4658, 54.3547, 150),
  ('sis-ruwais', 24.1094, 52.7289, 150);

-- Note: Replace with actual GPS coordinates for each branch
```

### staff_schedules Table (Optional)

```sql
CREATE TABLE staff_schedules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  branch_slug VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  
  -- Scheduled times
  scheduled_start TIME NOT NULL,
  scheduled_end TIME NOT NULL,
  
  -- Role assignment
  role_assigned VARCHAR(50), -- 'kitchen', 'counter', 'cleaner', etc.
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(user_id, date, branch_slug)
);

CREATE INDEX idx_schedules_user_date ON staff_schedules(user_id, date);
CREATE INDEX idx_schedules_branch_date ON staff_schedules(branch_slug, date);
```

### attendance_alerts Table

```sql
CREATE TABLE attendance_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  branch_slug VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  
  -- Alert details
  alert_type VARCHAR(50) NOT NULL, 
    -- 'not_clocked_in', 'forgot_clock_out', 'late_arrival', 'early_departure'
  alert_message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning', -- 'info', 'warning', 'critical'
  
  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolution_note TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Index
  CHECK (severity IN ('info', 'warning', 'critical'))
);

CREATE INDEX idx_alerts_unresolved ON attendance_alerts(resolved) WHERE NOT resolved;
CREATE INDEX idx_alerts_date ON attendance_alerts(date);
```

---

## 🎨 UI/UX DESIGN

### 1. Staff Mobile View - Clock In

```tsx
// Page: /app/attendance/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default function StaffAttendancePage() {
  const [location, setLocation] = useState<{
    lat: number
    lng: number
    accuracy: number
  } | null>(null)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<'clocked_out' | 'clocked_in'>('clocked_out')

  useEffect(() => {
    checkLocationPermission()
    fetchAttendanceStatus()
  }, [])

  const checkLocationPermission = async () => {
    try {
      const position = await getUserLocation()
      setLocation({
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy
      })

      // Detect which branch user is at
      const detectedBranch = await fetch('/api/attendance/detect-branch', {
        method: 'POST',
        body: JSON.stringify({ 
          latitude: position.latitude, 
          longitude: position.longitude 
        })
      }).then(res => res.json())

      setBranch(detectedBranch)
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Staff Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Good Morning Message */}
          <div>
            <h2 className="text-xl font-semibold">Good Morning, Ahmed! ☀️</h2>
          </div>

          {/* Location Status */}
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-5 w-5 animate-pulse" />
              <span>Detecting your location...</span>
            </div>
          ) : branch ? (
            <div className="flex items-center gap-2 text-green-600">
              <MapPin className="h-5 w-5" />
              <span className="font-medium">You're at: {branch.name} ✓</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">You're not at any branch</span>
            </div>
          )}

          {/* Current Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>{new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>

          {/* Scheduled Shift */}
          {branch && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Scheduled Shift:</strong> 7:00 AM - 3:00 PM
              </p>
              <Badge variant="secondary" className="mt-1">
                On Time ✓
              </Badge>
            </div>
          )}

          {/* Clock In/Out Button */}
          {attendanceStatus === 'clocked_out' ? (
            <Button
              className="w-full h-16 text-lg"
              disabled={!branch}
              onClick={handleClockIn}
            >
              {branch ? 'CLOCK IN' : 'CLOCK IN (Not at branch)'}
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Shift Timer */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Shift Time</p>
                    <p className="text-4xl font-bold">2h 15m</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Expected end: 3:00 PM
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Clock Out Button */}
              <Button
                variant="destructive"
                className="w-full h-16 text-lg"
                disabled={!branch}
                onClick={handleClockOut}
              >
                CLOCK OUT
              </Button>
            </div>
          )}

          {/* GPS Accuracy Info */}
          {location && (
            <p className="text-xs text-muted-foreground text-center">
              Accuracy: {location.accuracy < 50 ? 'High' : 'Medium'} 
              (GPS ± {Math.round(location.accuracy)}m)
            </p>
          )}

          {/* Week Summary */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Your Week:</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>• Monday:</span>
                <span className="font-medium">8h 15m ✓</span>
              </div>
              <div className="flex justify-between">
                <span>• Tuesday:</span>
                <span className="font-medium">8h 05m ✓</span>
              </div>
              <div className="flex justify-between">
                <span>• Wednesday:</span>
                <span className="font-medium">7h 55m ✓</span>
              </div>
              <div className="flex justify-between">
                <span>• Thursday:</span>
                <span className="text-blue-600">In progress...</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-red-900">
                  Location Access Required
                </h3>
                <p className="text-sm text-red-800">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

### 2. Manager Dashboard View

```tsx
// Page: /app/branch/[slug]/attendance/page.tsx

export default function BranchAttendancePage({ params }: { params: { slug: string } }) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [branch, setBranch] = useState<Branch | null>(null)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{branch?.name} - Staff Attendance</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <Button>
          Export Report
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">1</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">1</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">85.7%</div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Present Staff */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Ahmed K. - Kitchen Staff</p>
                  <p className="text-sm text-muted-foreground">
                    ✓ Clocked in: 6:58 AM (2 min early)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    📍 Location verified • ⏱️ Current: 8h 15m
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">View Details</Button>
                <Button variant="outline" size="sm">Message</Button>
              </div>
            </div>
          </div>

          {/* Late Staff */}
          <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">Sarah M. - Counter Staff</p>
                  <p className="text-sm text-yellow-800">
                    🟡 Clocked in: 7:15 AM (15 min late)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    📍 Location verified • ⏱️ Current: 7h 58m
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </div>
          </div>

          {/* Absent Staff */}
          <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">John D. - Cleaner</p>
                  <p className="text-sm text-red-800">
                    🔴 Not clocked in (Scheduled 7:00 AM)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    📱 Last seen: Yesterday 3:05 PM
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Manual Entry</Button>
                <Button variant="outline" size="sm">Call</Button>
                <Button variant="destructive" size="sm">Mark Absent</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline">
          + Manual Entry
        </Button>
        <Button variant="outline">
          View History
        </Button>
      </div>
    </div>
  )
}
```

### 3. Regional Dashboard Widget

```tsx
// Component: /components/attendance/regional-overview-widget.tsx

export function AttendanceOverviewWidget() {
  return (
    <Card className="border-l-4 border-l-indigo-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            Staff Attendance
          </CardTitle>
          <Select defaultValue="today">
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">89</p>
            <p className="text-xs text-green-600">Present</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-700">5</p>
            <p className="text-xs text-red-600">Absent</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-700">8</p>
            <p className="text-xs text-amber-600">Late</p>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Rate</span>
            <span className="font-semibold">87.3%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all" 
              style={{ width: '87.3%' }}
            />
          </div>
        </div>

        {/* Branch Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Branch Breakdown:</h4>
          <div className="space-y-1.5">
            <BranchRow name="ISC Soufouh" present={5} total={6} status="warning" />
            <BranchRow name="ISC DIP" present={8} total={8} status="success" />
            <BranchRow name="ISC Sharjah" present={4} total={5} status="warning" />
            <BranchRow name="Central Kitchen" present={19} total={20} status="success" />
            <BranchRow name="Sabis YAS" present={4} total={6} status="danger" />
          </div>
        </div>

        {/* Alerts */}
        <div className="border-t pt-3 space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Alerts
          </h4>
          <div className="space-y-1 text-xs">
            <div className="p-2 bg-red-50 text-red-800 rounded">
              • Sabis YAS: Low attendance (66%)
            </div>
            <div className="p-2 bg-yellow-50 text-yellow-800 rounded">
              • 3 staff forgot to clock out yesterday
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            View Full Report
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function BranchRow({ 
  name, 
  present, 
  total, 
  status 
}: { 
  name: string
  present: number
  total: number
  status: 'success' | 'warning' | 'danger'
}) {
  const percentage = Math.round((present / total) * 100)
  const statusColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  }
  const statusIcons = {
    success: '✅',
    warning: '🟡',
    danger: '🔴'
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{name}</span>
      <div className="flex items-center gap-2">
        <div className="w-20 bg-gray-200 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full ${
              status === 'success' ? 'bg-green-500' :
              status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`font-medium ${statusColors[status]}`}>
          {present}/{total}
        </span>
        <span>{statusIcons[status]}</span>
      </div>
    </div>
  )
}
```

---

## 🔌 API ENDPOINTS

### 1. Clock In Endpoint

```typescript
// app/api/attendance/clock-in/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get request data
    const { latitude, longitude, accuracy } = await req.json()

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Location data required' },
        { status: 400 }
      )
    }

    // 3. Check GPS accuracy
    if (accuracy > 100) {
      return NextResponse.json(
        { error: 'GPS accuracy too low. Please move to an open area.' },
        { status: 400 }
      )
    }

    // 4. Detect which branch user is at
    const branchResult = await sql`
      SELECT 
        bg.branch_slug,
        b.name as branch_name,
        bg.center_latitude,
        bg.center_longitude,
        bg.radius_meters,
        (
          6371000 * acos(
            cos(radians(${latitude})) * 
            cos(radians(bg.center_latitude)) * 
            cos(radians(bg.center_longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(bg.center_latitude))
          )
        ) as distance_meters
      FROM branch_geofences bg
      JOIN branches b ON b.slug = bg.branch_slug
      WHERE bg.is_active = true
      HAVING distance_meters <= bg.radius_meters
      ORDER BY distance_meters ASC
      LIMIT 1
    `

    if (branchResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'You are not at any branch location' },
        { status: 400 }
      )
    }

    const branch = branchResult.rows[0]

    // 5. Check if user has access to this branch
    const accessCheck = await sql`
      SELECT 1 FROM user_branch_access
      WHERE user_id = ${session.user.id}
      AND branch_slug = ${branch.branch_slug}
    `

    // Admin, regional_manager, operations_lead have access to all branches
    const user = await sql`
      SELECT role FROM users WHERE id = ${session.user.id}
    `
    
    const hasUniversalAccess = ['admin', 'regional_manager', 'operations_lead'].includes(
      user.rows[0]?.role
    )

    if (!hasUniversalAccess && accessCheck.rows.length === 0) {
      return NextResponse.json(
        { error: `You don't have access to ${branch.branch_name}` },
        { status: 403 }
      )
    }

    // 6. Check if already clocked in today
    const existingRecord = await sql`
      SELECT * FROM attendance_records
      WHERE user_id = ${session.user.id}
      AND date = CURRENT_DATE
      AND clock_out_time IS NULL
    `

    if (existingRecord.rows.length > 0) {
      return NextResponse.json(
        { error: 'You are already clocked in' },
        { status: 400 }
      )
    }

    // 7. Get scheduled shift (if exists)
    const scheduleResult = await sql`
      SELECT scheduled_start, scheduled_end
      FROM staff_schedules
      WHERE user_id = ${session.user.id}
      AND branch_slug = ${branch.branch_slug}
      AND date = CURRENT_DATE
    `

    const schedule = scheduleResult.rows[0]

    // 8. Calculate if late
    const now = new Date()
    let minutesLate = 0
    let status = 'present'

    if (schedule) {
      const scheduledStart = new Date()
      const [hours, minutes] = schedule.scheduled_start.split(':')
      scheduledStart.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      if (now > scheduledStart) {
        minutesLate = Math.floor((now.getTime() - scheduledStart.getTime()) / 60000)
        if (minutesLate > 10) {
          status = 'late'
        }
      }
    }

    // 9. Security flags
    const flags: string[] = []
    
    // Flag if at edge of geofence (suspicious)
    if (branch.distance_meters > branch.radius_meters * 0.9) {
      flags.push('edge_clock_in')
    }
    
    // Flag if low accuracy
    if (accuracy > 50) {
      flags.push('low_accuracy')
    }

    // 10. Create attendance record
    const recordResult = await sql`
      INSERT INTO attendance_records (
        user_id,
        branch_slug,
        date,
        clock_in_time,
        clock_in_location,
        clock_in_accuracy,
        status,
        minutes_late,
        device_info,
        flags
      ) VALUES (
        ${session.user.id},
        ${branch.branch_slug},
        CURRENT_DATE,
        CURRENT_TIMESTAMP,
        ${JSON.stringify({ lat: latitude, lng: longitude })}::jsonb,
        ${accuracy},
        ${status},
        ${minutesLate},
        ${JSON.stringify({
          userAgent: req.headers.get('user-agent'),
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
        })}::jsonb,
        ${flags}
      )
      RETURNING *
    `

    const record = recordResult.rows[0]

    // 11. Create alert if late
    if (status === 'late') {
      await sql`
        INSERT INTO attendance_alerts (
          user_id,
          branch_slug,
          date,
          alert_type,
          alert_message,
          severity
        ) VALUES (
          ${session.user.id},
          ${branch.branch_slug},
          CURRENT_DATE,
          'late_arrival',
          ${`Staff clocked in ${minutesLate} minutes late`},
          'warning'
        )
      `
    }

    // 12. Notify manager (push notification or websocket)
    // TODO: Implement notification system

    return NextResponse.json({
      success: true,
      record: {
        id: record.id,
        branch: branch.branch_name,
        clockInTime: record.clock_in_time,
        status: record.status,
        minutesLate: record.minutes_late
      }
    })

  } catch (error) {
    console.error('Clock-in error:', error)
    return NextResponse.json(
      { error: 'Failed to clock in. Please try again.' },
      { status: 500 }
    )
  }
}
```

### 2. Clock Out Endpoint

```typescript
// app/api/attendance/clock-out/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'
import { differenceInMinutes } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get request data
    const { latitude, longitude, accuracy } = await req.json()

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Location data required' },
        { status: 400 }
      )
    }

    // 3. Get today's attendance record
    const recordResult = await sql`
      SELECT 
        ar.*,
        bg.center_latitude,
        bg.center_longitude,
        bg.radius_meters
      FROM attendance_records ar
      JOIN branch_geofences bg ON bg.branch_slug = ar.branch_slug
      WHERE ar.user_id = ${session.user.id}
      AND ar.date = CURRENT_DATE
      AND ar.clock_out_time IS NULL
      ORDER BY ar.clock_in_time DESC
      LIMIT 1
    `

    if (recordResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No active clock-in found for today' },
        { status: 400 }
      )
    }

    const record = recordResult.rows[0]

    // 4. Verify still at branch
    const distance = calculateDistance(
      latitude,
      longitude,
      record.center_latitude,
      record.center_longitude
    )

    if (distance > record.radius_meters) {
      return NextResponse.json(
        { 
          error: 'You must be at the branch to clock out',
          distanceFromBranch: Math.round(distance)
        },
        { status: 400 }
      )
    }

    // 5. Calculate total hours
    const clockInTime = new Date(record.clock_in_time)
    const clockOutTime = new Date()
    const totalMinutes = differenceInMinutes(clockOutTime, clockInTime)
    const totalHours = (totalMinutes / 60).toFixed(2)

    // 6. Validate reasonable shift length
    if (totalMinutes < 60) {
      return NextResponse.json(
        { error: 'Shift too short (< 1 hour). Contact your manager if this is an error.' },
        { status: 400 }
      )
    }

    if (totalMinutes > 16 * 60) {
      // Flag if shift > 16 hours (forgot to clock out yesterday?)
      await sql`
        INSERT INTO attendance_alerts (
          user_id,
          branch_slug,
          date,
          alert_type,
          alert_message,
          severity
        ) VALUES (
          ${session.user.id},
          ${record.branch_slug},
          CURRENT_DATE,
          'excessive_hours',
          ${`Shift duration: ${totalHours} hours - review needed`},
          'warning'
        )
      `
    }

    // 7. Update attendance record
    await sql`
      UPDATE attendance_records
      SET
        clock_out_time = CURRENT_TIMESTAMP,
        clock_out_location = ${JSON.stringify({ lat: latitude, lng: longitude })}::jsonb,
        clock_out_accuracy = ${accuracy},
        total_hours = ${totalHours},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${record.id}
    `

    return NextResponse.json({
      success: true,
      record: {
        id: record.id,
        clockInTime: record.clock_in_time,
        clockOutTime: clockOutTime.toISOString(),
        totalHours: parseFloat(totalHours),
        totalMinutes: totalMinutes
      }
    })

  } catch (error) {
    console.error('Clock-out error:', error)
    return NextResponse.json(
      { error: 'Failed to clock out. Please try again.' },
      { status: 500 }
    )
  }
}

// Helper function
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}
```

### 3. Detect Branch Endpoint

```typescript
// app/api/attendance/detect-branch/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude } = await req.json()

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Location data required' },
        { status: 400 }
      )
    }

    // Find nearest branch within geofence
    const result = await sql`
      SELECT 
        bg.branch_slug,
        b.name,
        bg.center_latitude,
        bg.center_longitude,
        bg.radius_meters,
        (
          6371000 * acos(
            cos(radians(${latitude})) * 
            cos(radians(bg.center_latitude)) * 
            cos(radians(bg.center_longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(bg.center_latitude))
          )
        ) as distance_meters
      FROM branch_geofences bg
      LEFT JOIN branches b ON b.slug = bg.branch_slug
      WHERE bg.is_active = true
      ORDER BY distance_meters ASC
      LIMIT 1
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ branch: null })
    }

    const nearestBranch = result.rows[0]

    // Check if within geofence
    if (nearestBranch.distance_meters <= nearestBranch.radius_meters) {
      return NextResponse.json({
        branch: {
          slug: nearestBranch.branch_slug,
          name: nearestBranch.name,
          distance: Math.round(nearestBranch.distance_meters),
          withinGeofence: true
        }
      })
    } else {
      return NextResponse.json({
        branch: null,
        nearestBranch: {
          name: nearestBranch.name,
          distance: Math.round(nearestBranch.distance_meters)
        }
      })
    }

  } catch (error) {
    console.error('Detect branch error:', error)
    return NextResponse.json(
      { error: 'Failed to detect branch' },
      { status: 500 }
    )
  }
}
```

### 4. Get Attendance Status

```typescript
// app/api/attendance/status/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get today's attendance record
    const result = await sql`
      SELECT 
        ar.*,
        b.name as branch_name
      FROM attendance_records ar
      LEFT JOIN branches b ON b.slug = ar.branch_slug
      WHERE ar.user_id = ${session.user.id}
      AND ar.date = CURRENT_DATE
      ORDER BY ar.clock_in_time DESC
      LIMIT 1
    `

    if (result.rows.length === 0) {
      return NextResponse.json({
        status: 'clocked_out',
        record: null
      })
    }

    const record = result.rows[0]

    if (record.clock_out_time) {
      return NextResponse.json({
        status: 'clocked_out',
        record: {
          clockInTime: record.clock_in_time,
          clockOutTime: record.clock_out_time,
          totalHours: record.total_hours,
          branch: record.branch_name
        }
      })
    } else {
      // Calculate current shift duration
      const clockInTime = new Date(record.clock_in_time)
      const now = new Date()
      const minutesWorked = Math.floor(
        (now.getTime() - clockInTime.getTime()) / 60000
      )

      return NextResponse.json({
        status: 'clocked_in',
        record: {
          clockInTime: record.clock_in_time,
          branch: record.branch_name,
          branchSlug: record.branch_slug,
          minutesWorked,
          hoursWorked: (minutesWorked / 60).toFixed(1)
        }
      })
    }

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
```

### 5. Manual Entry Endpoint (Manager Only)

```typescript
// app/api/attendance/manual-entry/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate manager
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has manager role
    const userResult = await sql`
      SELECT role FROM users WHERE id = ${session.user.id}
    `
    
    const allowedRoles = ['admin', 'branch_manager', 'regional_manager', 'operations_lead']
    if (!allowedRoles.includes(userResult.rows[0]?.role)) {
      return NextResponse.json(
        { error: 'Only managers can create manual entries' },
        { status: 403 }
      )
    }

    // 2. Get request data
    const {
      staffUserId,
      branchSlug,
      date,
      clockInTime,
      clockOutTime,
      reason,
      notes
    } = await req.json()

    // Validate required fields
    if (!staffUserId || !branchSlug || !date || !clockInTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 3. Calculate total hours if clock-out provided
    let totalHours = null
    if (clockOutTime) {
      const start = new Date(`${date}T${clockInTime}`)
      const end = new Date(`${date}T${clockOutTime}`)
      const minutes = (end.getTime() - start.getTime()) / 60000
      totalHours = (minutes / 60).toFixed(2)
    }

    // 4. Check if record already exists
    const existingRecord = await sql`
      SELECT id FROM attendance_records
      WHERE user_id = ${staffUserId}
      AND branch_slug = ${branchSlug}
      AND date = ${date}
    `

    if (existingRecord.rows.length > 0) {
      // Update existing record
      await sql`
        UPDATE attendance_records
        SET
          clock_in_time = ${`${date}T${clockInTime}`}::timestamp,
          clock_out_time = ${clockOutTime ? `${date}T${clockOutTime}` : null}::timestamp,
          total_hours = ${totalHours},
          manually_edited = true,
          edited_by = ${session.user.id},
          edit_reason = ${reason},
          notes = ${notes},
          edit_timestamp = CURRENT_TIMESTAMP,
          status = 'present'
        WHERE id = ${existingRecord.rows[0].id}
      `

      return NextResponse.json({
        success: true,
        message: 'Attendance record updated',
        recordId: existingRecord.rows[0].id
      })
    } else {
      // Create new record
      const result = await sql`
        INSERT INTO attendance_records (
          user_id,
          branch_slug,
          date,
          clock_in_time,
          clock_out_time,
          total_hours,
          status,
          manually_edited,
          edited_by,
          edit_reason,
          notes
        ) VALUES (
          ${staffUserId},
          ${branchSlug},
          ${date},
          ${`${date}T${clockInTime}`}::timestamp,
          ${clockOutTime ? `${date}T${clockOutTime}` : null}::timestamp,
          ${totalHours},
          'present',
          true,
          ${session.user.id},
          ${reason},
          ${notes}
        )
        RETURNING id
      `

      return NextResponse.json({
        success: true,
        message: 'Manual attendance entry created',
        recordId: result.rows[0].id
      })
    }

  } catch (error) {
    console.error('Manual entry error:', error)
    return NextResponse.json(
      { error: 'Failed to create manual entry' },
      { status: 500 }
    )
  }
}
```

---

## 🔒 SECURITY & ANTI-CHEATING

### Detection Methods

#### 1. GPS Accuracy Validation

```typescript
// Only allow check-in if GPS accuracy is reasonable
if (accuracy > 100) {
  return {
    error: 'GPS accuracy too low. Please move to an open area with clear sky view.',
    currentAccuracy: accuracy,
    requiredAccuracy: 100
  }
}
```

#### 2. Geofence Edge Detection

```typescript
// Flag if user is at the very edge of geofence (suspicious)
const distanceFromCenter = calculateDistance(
  userLat, userLon,
  branchLat, branchLon
)

const flags: string[] = []

if (distanceFromCenter > geofenceRadius * 0.9) {
  flags.push('edge_clock_in')
  // Notify manager for review
}
```

#### 3. Mock Location Detection

```typescript
// Android devices expose mock location flag
// Check in frontend before sending to API
if ('mocked' in position.coords && position.coords.mocked) {
  return {
    error: 'Mock location detected. Please disable fake GPS apps.',
    blocked: true
  }
}
```

#### 4. Shift Duration Validation

```typescript
// Flag extremely short or long shifts
const totalMinutes = differenceInMinutes(clockOut, clockIn)

if (totalMinutes < 60) {
  return { error: 'Shift too short (< 1 hour)' }
}

if (totalMinutes > 16 * 60) {
  createAlert({
    type: 'excessive_hours',
    severity: 'warning',
    message: `Shift duration: ${totalMinutes / 60} hours`
  })
}
```

#### 5. Pattern Analysis

```typescript
// Flag suspicious patterns (future enhancement)
// - Always clocks in at exact geofence edge
// - Unrealistic travel times between locations
// - Always same GPS coordinates (spoofing)

async function detectSuspiciousPatterns(userId: number) {
  const recentRecords = await sql`
    SELECT 
      clock_in_location,
      clock_in_accuracy,
      flags
    FROM attendance_records
    WHERE user_id = ${userId}
    AND date > CURRENT_DATE - INTERVAL '30 days'
  `

  // Check for repeated identical coordinates
  const coordinates = recentRecords.rows.map(r => r.clock_in_location)
  const uniqueCoords = new Set(coordinates.map(c => `${c.lat},${c.lng}`))
  
  if (uniqueCoords.size < recentRecords.rows.length * 0.3) {
    // Less than 30% unique coordinates - suspicious
    return { suspicious: true, reason: 'repeated_coordinates' }
  }

  // Check for excessive edge clock-ins
  const edgeClockIns = recentRecords.rows.filter(r => 
    r.flags?.includes('edge_clock_in')
  ).length
  
  if (edgeClockIns > recentRecords.rows.length * 0.5) {
    // More than 50% edge clock-ins - suspicious
    return { suspicious: true, reason: 'excessive_edge_clock_ins' }
  }

  return { suspicious: false }
}
```

#### 6. Device Fingerprinting

```typescript
// Track device IDs to prevent shared devices
const deviceInfo = {
  userAgent: req.headers.get('user-agent'),
  ip: req.headers.get('x-forwarded-for'),
  screenResolution: `${screen.width}x${screen.height}`,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  language: navigator.language
}

// Store and compare across users
const deviceFingerprint = createHash('sha256')
  .update(JSON.stringify(deviceInfo))
  .digest('hex')

// Check if multiple users use same device
const sharedDeviceCheck = await sql`
  SELECT DISTINCT user_id
  FROM attendance_records
  WHERE device_info->>'fingerprint' = ${deviceFingerprint}
  AND date > CURRENT_DATE - INTERVAL '7 days'
`

if (sharedDeviceCheck.rows.length > 1) {
  // Multiple users on same device - flag for review
  flags.push('shared_device')
}
```

---

## ⚖️ LEGAL COMPLIANCE (UAE)

### UAE Data Protection Law Compliance

#### 1. Employee Consent Form

**Required before implementation:**

```
EMPLOYEE LOCATION-BASED ATTENDANCE CONSENT FORM

Company: Mikana Food Services LLC
System: Geolocation-Based Attendance Tracking

I, _________________________________ (Employee Name), 
Employee ID: ____________, understand and consent to the following:

1. PURPOSE:
   Mikana uses location verification to confirm I am physically present 
   at my assigned branch when clocking in and out for my scheduled shifts.

2. WHAT DATA IS COLLECTED:
   • My GPS coordinates (latitude/longitude) ONLY at clock-in time
   • My GPS coordinates (latitude/longitude) ONLY at clock-out time
   • Timestamp of clock-in and clock-out
   • GPS accuracy measurement
   • Device type (for security purposes)
   • Branch location where I clocked in/out

3. WHAT IS NOT COLLECTED:
   • My location is NOT tracked continuously or in real-time
   • No background tracking between clock-in and clock-out
   • No tracking during breaks, lunch, or after hours
   • No tracking of my movement patterns
   • No tracking of where I go outside of work

4. DATA USAGE:
   • Used ONLY for attendance verification and payroll purposes
   • Stored securely with encryption
   • Accessible only to my direct manager and HR department
   • Not shared with any third parties
   • Retained as required by UAE Labor Law (minimum 2 years)

5. DATA SECURITY:
   • All location data is encrypted during transmission and storage
   • Access is logged and monitored
   • Compliant with UAE Federal Decree-Law No. 45 of 2021 (Data Protection)

6. MY RIGHTS:
   • I can request a copy of my attendance records at any time
   • I can request correction of any inaccurate records
   • I can revoke browser location permission (manual attendance available)
   • If location services fail, I can request manual check-in from my manager

7. LEGITIMATE BUSINESS PURPOSE:
   I understand this system ensures:
   • Fair and accurate time tracking for wages
   • Compliance with UAE Ministry of Human Resources & Emiratisation regulations
   • Protection against unauthorized attendance marking
   • Accurate records for labor law compliance

8. ALTERNATIVE OPTION:
   I understand that if I prefer not to use location-based check-in, 
   I can request manual attendance marking by my manager, though this 
   may require additional verification steps.

9. PRIVACY COMMITMENT:
   Mikana commits to using my location data ONLY for the stated purpose 
   and will never track my location outside of voluntary clock-in/out actions.

I HAVE READ AND UNDERSTOOD THIS CONSENT FORM. I VOLUNTARILY CONSENT TO 
THE COLLECTION AND USE OF MY LOCATION DATA AS DESCRIBED ABOVE.

Employee Signature: ____________________  Date: __________

Manager Signature: _____________________  Date: __________

HR Signature: __________________________  Date: __________

Note: A copy of this signed form will be provided to the employee.
```

#### 2. Privacy Policy Addition

**Add to employee handbook:**

```markdown
## ATTENDANCE TRACKING POLICY

### Effective Date: [Date]

### 1. PURPOSE
Mikana operates a location-verified attendance system to ensure employees 
are present at their assigned workplace when clocking in and out.

### 2. HOW IT WORKS
- Employees access mikana.app on their personal or company device
- When clocking in or out, the system requests location permission
- Location is checked to verify employee is within branch premises (150-200m radius)
- Location is recorded ONLY at clock-in and clock-out moments
- No continuous tracking or monitoring occurs

### 3. DATA COLLECTED
The following data is collected during clock-in/out:
- GPS coordinates (latitude/longitude)
- Timestamp
- GPS accuracy measurement
- Branch location
- Device type (for security)

### 4. DATA NOT COLLECTED
Mikana does NOT:
- Track employee location continuously
- Monitor employee movements during work hours
- Track employee location outside work hours
- Track employee location during breaks
- Record home addresses or personal locations

### 5. DATA PROTECTION
- All location data is encrypted using industry-standard encryption (TLS/SSL)
- Data is stored securely on company servers
- Access is restricted to authorized personnel only (direct manager, HR, IT admin)
- Data is retained for minimum period required by UAE labor law
- Compliant with UAE Federal Decree-Law No. 45 of 2021 (Data Protection Law)
- Compliant with UAE Federal Law No. 33 of 2021 (Labor Law)

### 6. EMPLOYEE RIGHTS
Under UAE Data Protection Law, employees have the right to:
- Access their attendance records
- Request correction of inaccurate data
- Understand how their data is used
- Withdraw consent (with alternative manual attendance available)

To exercise these rights, contact: hr@mikana.ae

### 7. MANUAL ATTENDANCE OPTION
If an employee experiences technical issues or prefers not to use 
location-based check-in, they may request manual attendance marking 
from their manager. Manual entries require manager verification and 
documentation of reason.

### 8. SECURITY MEASURES
To prevent fraudulent attendance:
- GPS accuracy must be sufficient (<100m)
- Location must be within branch geofence
- System flags suspicious patterns for review
- Manager approval required for manual entries

### 9. DATA RETENTION
- Detailed location data: Retained for 3 months
- After 3 months: GPS coordinates deleted, attendance record retained
- Attendance records: Retained for 2 years (UAE labor law requirement)
- After 2 years: Records archived or deleted per company policy

### 10. QUESTIONS OR CONCERNS
For questions about this policy or attendance tracking:
- Contact your direct manager
- Contact HR at hr@mikana.ae
- Contact Data Protection Officer (if appointed)

### 11. POLICY UPDATES
This policy may be updated to reflect changes in technology or regulations.
Employees will be notified of significant changes.

---

ACKNOWLEDGMENT:
I acknowledge that I have read, understood, and agree to comply with 
this Attendance Tracking Policy.

Employee Name: _____________________
Employee Signature: ________________
Date: ______________________________
```

#### 3. In-App Privacy Notice

```tsx
// Show before first location request
function PrivacyNoticeModal() {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>📍 Location Permission Needed</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Why we need this:</h4>
            <p className="text-sm text-muted-foreground">
              To verify you're at your assigned branch when clocking 
              in and out.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">What we collect:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Your location only when you tap Clock In/Out</li>
              <li>✓ Timestamp of check-in/out</li>
              <li>✓ GPS accuracy measurement</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">What we DON'T do:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✗ Track your location continuously</li>
              <li>✗ Monitor you outside work hours</li>
              <li>✗ Share your location with anyone</li>
              <li>✗ Track your movement during work</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg text-sm">
            <p className="text-blue-900">
              🔒 Your privacy matters. Location is checked only 2 times 
              per day (clock-in & clock-out). Fully compliant with UAE 
              Data Protection Law.
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            <a href="/privacy-policy" className="underline">
              Read Full Privacy Policy
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDecline}>
            Decline
          </Button>
          <Button onClick={handleAccept}>
            I Understand, Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Compliance Checklist

**Before launching:**

- [ ] Legal review by UAE employment lawyer
- [ ] Data Protection Impact Assessment (DPIA) completed
- [ ] Employee consent forms prepared and translated (English/Arabic)
- [ ] Privacy policy updated
- [ ] Employee handbook updated
- [ ] Manager training on privacy obligations
- [ ] IT security audit completed
- [ ] Data encryption implemented
- [ ] Access controls configured
- [ ] Audit logging enabled
- [ ] Data retention policy defined
- [ ] Employee rights request process established
- [ ] Manual attendance alternative documented
- [ ] Staff training materials prepared
- [ ] HR notification process established

---

## 📅 IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
**Goal:** Set up core infrastructure

**Tasks:**
- [ ] Create database tables (attendance_records, branch_geofences, etc.)
- [ ] Add GPS coordinates for all 14 branches
- [ ] Implement geolocation utility functions
- [ ] Build clock-in API endpoint
- [ ] Build clock-out API endpoint
- [ ] Build detect-branch API endpoint
- [ ] Build status check API endpoint

**Deliverables:**
- Database schema created
- Core API endpoints functional
- Geolocation math working correctly

**Testing:**
- Test geofence detection with sample coordinates
- Verify distance calculations
- Test API endpoints with Postman/Insomnia

---

### Phase 2: Staff Mobile UI (Week 2)
**Goal:** Build staff-facing attendance interface

**Tasks:**
- [ ] Create /app/attendance page
- [ ] Implement location permission flow
- [ ] Build clock-in UI component
- [ ] Build clock-out UI component
- [ ] Add current shift timer
- [ ] Add week summary view
- [ ] Handle error states (location denied, not at branch, etc.)
- [ ] Add loading states
- [ ] Implement permission instructions

**Deliverables:**
- Fully functional staff attendance page
- Mobile-responsive design
- Clear error messaging

**Testing:**
- Test on multiple devices (iOS, Android)
- Test in different browsers
- Test permission denial flow
- Test offline behavior
- Test at actual branch locations

---

### Phase 3: Manager Dashboard (Week 3)
**Goal:** Build manager monitoring and control interface

**Tasks:**
- [ ] Create /app/branch/[slug]/attendance page
- [ ] Build live attendance overview
- [ ] Build staff list with status indicators
- [ ] Create manual entry form
- [ ] Add filters (date, status, role)
- [ ] Build attendance history view
- [ ] Add export functionality (CSV/Excel)
- [ ] Create alert system for late/absent staff
- [ ] Add manager notifications

**Deliverables:**
- Complete manager dashboard
- Manual override capability
- Export reports

**Testing:**
- Test manual entry with various scenarios
- Verify permissions (only managers can access)
- Test exports with different date ranges
- Test with multiple staff members

---

### Phase 4: Regional Dashboard (Week 4)
**Goal:** Build cross-branch analytics and reporting

**Tasks:**
- [ ] Enhance regional dashboard attendance widget
- [ ] Build branch comparison view
- [ ] Add attendance rate charts
- [ ] Create trend analysis
- [ ] Build alerts dashboard
- [ ] Add regional reports export
- [ ] Create attendance analytics API endpoints

**Deliverables:**
- Regional overview widget
- Multi-branch analytics
- Comprehensive reporting

**Testing:**
- Test with all 14 branches
- Verify calculations across branches
- Test performance with large datasets

---

### Phase 5: Polish & Security (Week 5)
**Goal:** Add security, notifications, and refinements

**Tasks:**
- [ ] Implement security validations (accuracy checks, edge detection)
- [ ] Add device fingerprinting
- [ ] Build pattern detection (suspicious behavior)
- [ ] Implement push notifications
- [ ] Add email alerts
- [ ] Build forgot-to-clock-out detection
- [ ] Add offline support (PWA)
- [ ] Create help/FAQ page
- [ ] Optimize performance
- [ ] Security audit

**Deliverables:**
- Anti-cheating measures active
- Notification system working
- Security hardened

**Testing:**
- Penetration testing
- Security audit
- GPS spoofing attempts
- Notification delivery testing

---

### Phase 6: Legal & Rollout (Week 6)
**Goal:** Legal compliance and staff onboarding

**Tasks:**
- [ ] Legal review by UAE lawyer
- [ ] Finalize consent forms
- [ ] Update privacy policy
- [ ] Translate documents (English/Arabic)
- [ ] Create training materials
- [ ] Conduct manager training
- [ ] Pilot test with 1-2 branches
- [ ] Gather feedback
- [ ] Full rollout to all branches

**Deliverables:**
- Legal approval obtained
- Staff trained
- System live in production

**Testing:**
- Pilot test with real users
- Monitor for issues
- Iterate based on feedback

---

## 🧪 TESTING STRATEGY

### Unit Tests

```typescript
// tests/geolocation.test.ts

describe('Geolocation Utils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Dubai coordinates
      const lat1 = 25.0894
      const lon1 = 55.1623
      const lat2 = 25.0164
      const lon2 = 55.1714
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2)
      expect(distance).toBeGreaterThan(8000) // ~8km
      expect(distance).toBeLessThan(9000)
    })

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(25.0, 55.0, 25.0, 55.0)
      expect(distance).toBe(0)
    })
  })

  describe('isWithinBranch', () => {
    it('should return true when within geofence', () => {
      const branchLat = 25.0894
      const branchLon = 55.1623
      const userLat = 25.0895 // Very close
      const userLon = 55.1624
      
      const result = isWithinBranch(
        userLat, userLon, 
        branchLat, branchLon, 
        150
      )
      expect(result).toBe(true)
    })

    it('should return false when outside geofence', () => {
      const branchLat = 25.0894
      const branchLon = 55.1623
      const userLat = 25.1894 // ~10km away
      const userLon = 55.1623
      
      const result = isWithinBranch(
        userLat, userLon, 
        branchLat, branchLon, 
        150
      )
      expect(result).toBe(false)
    })
  })
})
```

### Integration Tests

```typescript
// tests/attendance-api.test.ts

describe('Attendance API', () => {
  describe('POST /api/attendance/clock-in', () => {
    it('should allow clock-in when at branch', async () => {
      const response = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: 25.0894,
          longitude: 55.1623,
          accuracy: 15
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.record).toBeDefined()
    })

    it('should reject clock-in when not at branch', async () => {
      const response = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        body: JSON.stringify({
          latitude: 25.2894, // Far from branch
          longitude: 55.1623,
          accuracy: 15
        })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('not at any branch')
    })

    it('should reject with poor GPS accuracy', async () => {
      const response = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        body: JSON.stringify({
          latitude: 25.0894,
          longitude: 55.1623,
          accuracy: 250 // Too inaccurate
        })
      })

      expect(response.status).toBe(400)
      expect(data.error).toContain('accuracy too low')
    })
  })
})
```

### Manual Testing Checklist

**Staff Mobile Testing:**
- [ ] Clock in at actual branch location
- [ ] Try to clock in from home (should fail)
- [ ] Try to clock in from another branch (should fail)
- [ ] Clock out at branch
- [ ] Try to clock out after leaving (should fail)
- [ ] Test with location permission denied
- [ ] Test with airplane mode (offline)
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test on slow network

**Manager Dashboard Testing:**
- [ ] View live attendance for branch
- [ ] Create manual entry for staff
- [ ] Edit existing attendance record
- [ ] Export attendance report
- [ ] Filter by date range
- [ ] Filter by status (present/late/absent)
- [ ] Receive alert for late staff
- [ ] Receive alert for absent staff

**Regional Dashboard Testing:**
- [ ] View all branches overview
- [ ] Compare attendance across branches
- [ ] Export regional report
- [ ] View alerts from multiple branches
- [ ] Check performance with all 14 branches

**Security Testing:**
- [ ] Try GPS spoofing apps
- [ ] Test with mock location enabled
- [ ] Try to clock in at geofence edge
- [ ] Test device sharing detection
- [ ] Verify encryption of location data
- [ ] Test access controls (staff can't access manager features)

---

## 🚨 EDGE CASES & SOLUTIONS

### 1. GPS Not Working

**Problem:** User's phone GPS is disabled or not functioning.

**Detection:**
```typescript
if (error.code === error.POSITION_UNAVAILABLE) {
  // GPS hardware issue or disabled
}
```

**Solution:**
- Show clear instructions to enable location in phone settings
- Offer manual check-in with manager verification
- Send notification to manager

**UI Message:**
```
⚠️ GPS Not Available

Your phone's GPS is disabled or not working.

To enable:
1. Go to phone Settings
2. Find Location/Privacy
3. Enable Location Services
4. Allow for your browser

Alternatively, ask your manager for manual check-in.

[Notify Manager] [Try Again]
```

---

### 2. Poor GPS Accuracy

**Problem:** GPS accuracy is >100m, making geofence unreliable.

**Detection:**
```typescript
if (position.coords.accuracy > 100) {
  return { error: 'GPS accuracy too low' }
}
```

**Solution:**
- Ask user to move to open area
- Wait for better GPS lock
- Show accuracy indicator
- Allow manager override if persistent

**UI Message:**
```
⚠️ GPS Accuracy Low

Current accuracy: ±145m (need <100m)

Tips to improve:
• Move to open area with clear sky view
• Move away from tall buildings
• Ensure Location is set to "High Accuracy" in phone settings
• Wait a few seconds for GPS to lock

[Check Again]
```

---

### 3. Forgot to Clock In

**Problem:** Staff forgot to clock in when arriving, realizes hours later.

**Detection:**
```typescript
// Daily check at 9:00 AM
const staffWithoutClockIn = await sql`
  SELECT u.id, u.first_name, u.last_name, ss.branch_slug
  FROM users u
  JOIN staff_schedules ss ON ss.user_id = u.id
  LEFT JOIN attendance_records ar ON ar.user_id = u.id AND ar.date = CURRENT_DATE
  WHERE ss.date = CURRENT_DATE
  AND ss.scheduled_start < CURRENT_TIME - INTERVAL '15 minutes'
  AND ar.id IS NULL
`
```

**Solution:**
- Send notification to staff: "Did you forget to clock in?"
- Send alert to manager
- Manager can create manual entry
- Document reason in notes

**Manager Process:**
1. Receive alert: "John D. hasn't clocked in yet"
2. Verify staff is present
3. Create manual entry with actual arrival time
4. Add note: "Forgot to clock in - confirmed by manager"

---

### 4. Forgot to Clock Out

**Problem:** Staff left branch without clocking out.

**Detection:**
```typescript
// Check next morning
const forgotClockOut = await sql`
  SELECT * FROM attendance_records
  WHERE date < CURRENT_DATE
  AND clock_out_time IS NULL
`
```

**Solution:**
- Send notification to staff next day
- Alert manager
- Manager reviews and manually sets clock-out time
- Can check security logs, camera footage for verification

**Automated Action:**
```typescript
// Send email next morning
sendEmail({
  to: staff.email,
  subject: 'Forgot to clock out yesterday',
  body: `
    Hi ${staff.firstName},
    
    You forgot to clock out yesterday.
    Your manager will review and adjust your hours.
    
    Please remember to clock out before leaving.
  `
})
```

---

### 5. Phone Battery Died

**Problem:** Staff's phone died during shift, can't clock out.

**Solution:**
- Staff reports to manager
- Manager creates manual clock-out entry
- Document reason: "Phone battery died"
- Verify with security logs if needed

**Manager UI:**
```
Manual Clock-Out Entry

Staff: Ahmed K.
Date: Jan 22, 2026
Clock-in: 7:02 AM (automatic)
Clock-out: 3:00 PM (manual)

Reason: ○ GPS issues
        ○ Phone issues
        ● Phone battery died
        ○ Other

Notes: [Staff reported phone died at 2:30 PM]

[Cancel] [Submit]
```

---

### 6. Multiple Branches Same Day

**Problem:** Manager visits multiple branches in one day.

**Solution:**
- Allow multiple clock-in/out records per day
- Each record tied to specific branch
- Total hours calculated across all locations

**Database:**
```sql
-- User can have multiple records for same day
-- but different branches
SELECT * FROM attendance_records
WHERE user_id = 123
AND date = '2026-01-22'
ORDER BY clock_in_time

-- Results:
-- Clock in at Central Kitchen: 7:00 AM - 11:00 AM
-- Clock out: 11:00 AM
-- Clock in at ISC Soufouh: 12:00 PM - 3:00 PM
-- Clock out: 3:00 PM
-- Total: 7 hours
```

---

### 7. Indoor GPS Issues

**Problem:** GPS signal weak inside building, location shows as outside geofence.

**Solution:**
- Set geofence radius to 150-200m to account for indoor GPS drift
- Monitor GPS accuracy value
- If accuracy >50m but still reasonable, show warning but allow
- Manager can verify if issues persist

**Handling:**
```typescript
if (accuracy > 50 && accuracy < 100) {
  // Borderline accuracy - allow but flag
  flags.push('moderate_accuracy')
  showWarning('GPS accuracy is moderate. Clock-in recorded.')
}
```

---

### 8. Location Permission Revoked Mid-Day

**Problem:** User revoked location permission after clocking in, can't clock out.

**Detection:**
```typescript
if (error.code === error.PERMISSION_DENIED && isClockedIn) {
  // Permission was granted earlier but now denied
}
```

**Solution:**
- Show instructions to re-enable
- Contact manager if can't resolve
- Manager can clock out manually

**UI:**
```
⚠️ Location Permission Needed

You clocked in earlier but location access is now disabled.
Please re-enable to clock out.

[Re-enable Location]
[Contact Manager]
```

---

### 9. GPS Spoofing Detected

**Problem:** Staff using fake GPS app to clock in from home.

**Detection:**
```typescript
// Android exposes mock location flag
if (position.coords.mocked) {
  return { error: 'Mock location detected' }
}

// Pattern detection
if (flagCount > threshold) {
  notifyManager('Suspicious activity detected')
}
```

**Solution:**
- Block clock-in attempt
- Show error message
- Alert manager
- Document incident
- HR review if repeated

**Manager Alert:**
```
🚨 Security Alert

Ahmed K. attempted to clock in with mock location enabled.

Action Required:
• Speak with employee
• Review attendance policy
• Document incident

[View Details] [Dismiss]
```

---

### 10. Offline Clock-In Attempt

**Problem:** No internet connection when trying to clock in.

**Solution (Future Enhancement):**
- Cache clock-in locally
- Show "Will sync when online" message
- Sync when connection restored
- Validate server-side after sync

**Current Solution:**
- Show error: "No internet connection"
- Staff must wait for connection
- Or contact manager for manual entry

---

### 11. Wrong Branch Detection

**Problem:** Staff at correct branch but system detects different branch (if branches are close).

**Solution:**
- Ensure branch geofences don't overlap
- If detection ambiguous, show branch selector
- Log distance to all nearby branches
- Manager can correct if wrong branch logged

**UI When Multiple Branches Nearby:**
```
📍 Multiple Branches Detected

We detected you near:
○ ISC Soufouh (45m away)
○ ISC DIP (180m away)

Which branch are you at?

[Confirm: ISC Soufouh]
```

---

### 12. Time Zone Issues

**Problem:** Timestamp doesn't match actual time (shouldn't happen in UAE, all one timezone).

**Solution:**
- Always use UTC in database
- Convert to Arabia Standard Time (AST/GST) for display
- Verify server timezone is configured correctly

```typescript
// Always store as UTC
const clockInTime = new Date().toISOString()

// Display in local timezone
const displayTime = new Date(clockInTime).toLocaleString('en-AE', {
  timeZone: 'Asia/Dubai',
  hour: '2-digit',
  minute: '2-digit'
})
```

---

## 📊 ANALYTICS & REPORTING

### Key Metrics to Track

1. **Attendance Rate**
   - Overall: (Present + Late) / Total Staff
   - By branch
   - By department
   - By day of week

2. **Punctuality**
   - Average minutes late
   - On-time percentage
   - Chronic late arrivals

3. **Hours Worked**
   - Total hours per staff per week
   - Average shift duration
   - Overtime hours

4. **Absenteeism**
   - Absence rate
   - Patterns (Monday absences, etc.)
   - Unexcused vs excused

5. **System Usage**
   - Clock-in success rate
   - Location accuracy average
   - Manual entries percentage

### Sample Report Queries

```sql
-- Weekly attendance summary for branch
SELECT 
  u.first_name || ' ' || u.last_name as name,
  COUNT(ar.id) as days_present,
  SUM(ar.total_hours) as total_hours,
  AVG(ar.minutes_late) as avg_minutes_late,
  SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_count
FROM users u
LEFT JOIN attendance_records ar ON ar.user_id = u.id
WHERE ar.branch_slug = 'isc-soufouh'
AND ar.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY u.id, u.first_name, u.last_name
ORDER BY name;

-- Branch attendance comparison
SELECT 
  b.name as branch,
  COUNT(DISTINCT ar.user_id) as staff_count,
  COUNT(ar.id) as total_shifts,
  AVG(ar.total_hours) as avg_hours,
  ROUND(AVG(CASE WHEN ar.status IN ('present', 'late') THEN 100 ELSE 0 END), 1) as attendance_rate
FROM branches b
LEFT JOIN attendance_records ar ON ar.branch_slug = b.slug
WHERE ar.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY b.slug, b.name
ORDER BY attendance_rate DESC;

-- Chronic late arrivals
SELECT 
  u.first_name || ' ' || u.last_name as name,
  b.name as branch,
  COUNT(*) as late_count,
  AVG(ar.minutes_late) as avg_minutes_late
FROM attendance_records ar
JOIN users u ON u.id = ar.user_id
JOIN branches b ON b.slug = ar.branch_slug
WHERE ar.status = 'late'
AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.first_name, u.last_name, b.name
HAVING COUNT(*) >= 5
ORDER BY late_count DESC;
```

---

## 🔄 FUTURE ENHANCEMENTS

### Phase 2 Features (Post-Launch)

1. **Shift Scheduling**
   - Create weekly schedules
   - Assign roles per shift
   - Swap shifts
   - Coverage alerts

2. **Break Tracking**
   - Clock in/out for breaks
   - Lunch break tracking
   - Labor law compliance (mandatory breaks)

3. **Overtime Management**
   - Automatic overtime calculation
   - Overtime approval workflow
   - Overtime limits/alerts

4. **Leave Management Integration**
   - Sick leave
   - Vacation leave
   - Emergency leave
   - Leave approval workflow

5. **Payroll Integration**
   - Export to payroll format
   - Direct integration with payroll system
   - Overtime calculations
   - Deductions for late/absent

6. **Advanced Analytics**
   - Predictive absenteeism
   - Staffing optimization
   - Cost per labor hour
   - Productivity metrics

7. **Mobile App (Native)**
   - Better offline support
   - Push notifications
   - Background geofencing
   - Biometric authentication

8. **Face Recognition**
   - Selfie at clock-in
   - Prevent buddy punching
   - AI comparison with profile photo

9. **Multi-Language Support**
   - Arabic interface
   - Other languages as needed

10. **API for Third-Party Integration**
    - HRIS systems
    - Time tracking software
    - Accounting software

---

## 📞 SUPPORT & MAINTENANCE

### Monitoring

**Key Things to Monitor:**
- Clock-in/out success rates
- GPS accuracy distribution
- Location permission denial rates
- Manual entry frequency
- System response times
- Error rates

**Alerts to Set Up:**
- High manual entry rate (> 20%)
- Low clock-in rate (< 80%)
- GPS accuracy issues
- API errors
- Database performance issues

### Common Issues & Troubleshooting

**Issue: Staff can't clock in**
1. Check location permission granted
2. Verify GPS is enabled on device
3. Check GPS accuracy (<100m)
4. Verify user has branch access
5. Check API logs for errors

**Issue: Wrong branch detected**
1. Verify branch GPS coordinates are correct
2. Check geofence radius
3. Check for overlapping geofences
4. Verify distance calculation

**Issue: Performance slow**
1. Check database indexes
2. Review query performance
3. Check API response times
4. Optimize frontend rendering

### Maintenance Schedule

**Daily:**
- Monitor error logs
- Check for forgot-to-clock-out alerts
- Review flagged suspicious activity

**Weekly:**
- Review manual entry reasons
- Analyze attendance trends
- Check system performance metrics
- Address any recurring issues

**Monthly:**
- Generate compliance reports
- Review and optimize database
- Update branch GPS coordinates if changed
- Security audit
- User feedback review

---

## 📚 RESOURCES & REFERENCES

### Technical Documentation
- [MDN: Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [PostgreSQL PostGIS](https://postgis.net/) (if using PostGIS extension)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

### UAE Legal References
- [UAE Federal Decree-Law No. 45 of 2021 (Data Protection)](https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/federal-governments-strategies-and-plans/personal-data-protection-law)
- [UAE Federal Law No. 33 of 2021 (Labor Law)](https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector)
- [Ministry of Human Resources & Emiratisation](https://www.mohre.gov.ae/)

### Security Resources
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [GPS Spoofing Detection](https://developer.android.com/reference/android/location/Location#isMock())

### Design Inspiration
- Modern attendance systems
- Time tracking apps
- Geofencing applications

---

## ✅ PRE-IMPLEMENTATION CHECKLIST

**Before starting development:**

- [ ] Legal approval obtained
- [ ] Budget approved
- [ ] Resources allocated (developers, designers)
- [ ] Timeline confirmed
- [ ] Stakeholders aligned

**Before launching:**

- [ ] All phases completed
- [ ] Testing passed
- [ ] Security audit passed
- [ ] Legal compliance verified
- [ ] Employee consent forms signed
- [ ] Staff training completed
- [ ] Manager training completed
- [ ] Documentation finalized
- [ ] Support plan established
- [ ] Rollback plan ready

**Post-launch:**

- [ ] Monitor first week closely
- [ ] Gather user feedback
- [ ] Address issues quickly
- [ ] Review metrics daily
- [ ] Plan iterations

---

## 🎯 SUCCESS CRITERIA

**System is successful if:**

1. **Accuracy:** >95% of clock-ins/outs are successful
2. **Adoption:** >90% of staff use system regularly
3. **Compliance:** Zero legal/privacy issues
4. **Reliability:** <1% system downtime
5. **Security:** Zero successful GPS spoofing
6. **Satisfaction:** >80% positive staff feedback
7. **Efficiency:** <10% manual entries needed

---

## 📝 FINAL NOTES

This system provides a balance between:
- **Accuracy:** Geolocation ensures staff are physically present
- **Privacy:** Only 2-3 location checks per day, not continuous tracking
- **Usability:** Simple tap to clock in/out
- **Compliance:** Meets UAE legal requirements
- **Security:** Multiple anti-cheating measures
- **Flexibility:** Manual override when needed

**Key Advantages:**
- No additional hardware needed (no biometric scanners)
- Works on any smartphone
- No app installation required (web-based)
- Instant updates (no app store delays)
- Cross-platform (iOS, Android, desktop)
- Scales to unlimited branches

**Implementation Timeline:** 6 weeks total
**Estimated Cost:** Developer time only (no hardware costs)
**ROI:** Improved attendance accuracy, reduced time theft, better payroll accuracy

---

**This document is a complete implementation guide. When ready to build, refer to this document and implement phase by phase.** 🚀

---

*Document Version: 1.0*  
*Last Updated: January 22, 2026*  
*Status: Ready for Implementation*
