# Central Kitchen Workflow System - Implementation Plan

## Overview

Design and implement a task delegation and production workflow system for a central kitchen with 6 tablets:
- **1 Head Chef tablet** - Receives production schedules, delegates tasks to stations
- **2 Hot Section tablets** - Both see same tasks, chefs self-organize
- **1 Cold Section tablet**
- **1 Baker tablet**
- **1 Butcher tablet**

## User Workflow

### 1. Operations Lead → Head Chef
- Operations lead creates weekly production schedule (existing feature)
- Head chef receives schedule and delegates items to stations

### 2. Head Chef → Stations
- Head chef assigns production items to each station
- Example: Baker receives 10kg cookies, 20kg brownies, 10kg cake, 5kg banana bread, 5kg waffle

### 3. Station Work
- Station sees assigned items for the day
- Clicks "View Recipe" to see recipe scaled to target quantity (e.g., 10kg instead of 1kg base)
- Works through recipe with sub-recipe workflow tracking
- Marks each sub-recipe complete as they progress
- When done, enters actual quantity produced and marks item complete

### 4. Progress Monitoring
- Head chef sees real-time progress across all 4 stations
- Can reassign items if needed
- Monitors actual vs. target quantities

- Add a section for photos for hygiene 

## Technical Implementation

### Phase 1: Data Model & Auth (Foundation)

#### 1.1 Update Production Stations
**File**: `lib/data.ts`

Update `ProductionStation` type from current 4 stations to new 4 stations:
```typescript
// Current: 'Butchery' | 'Hot Section' | 'Pantry' | 'Desserts'
// New:
export type ProductionStation = 'Hot Section' | 'Cold Section' | 'Baker' | 'Butcher'
```

#### 1.2 Extend ProductionItem Interface
**File**: `lib/data.ts`

Add assignment and progress tracking fields:
```typescript
export interface ProductionItem {
  // ... existing fields

  // NEW: Task delegation fields
  assignedTo?: string | null          // Station name
  assignedBy?: string | null          // Head chef user ID
  assignedAt?: string | null          // ISO timestamp

  // NEW: Actual quantity tracking
  actualQuantity?: number | null
  actualUnit?: string | null

  // NEW: Time tracking
  startedAt?: string | null
  completedAt?: string | null

  // NEW: Sub-recipe progress tracking
  subRecipeProgress?: {
    [subRecipeId: string]: {
      completed: boolean
      completedAt?: string | null
    }
  }

  // NEW: Link to recipe for scaling
  recipeId?: string | null
}
```

**Migration**: All new fields are optional for backward compatibility with existing schedules.

#### 1.3 Add New User Roles
**File**: `lib/auth.ts`

Add 2 new roles:
```typescript
export type UserRole =
  | 'admin'
  | 'regional_manager'
  | 'operations_lead'
  | 'dispatcher'
  | 'central_kitchen'
  | 'head_chef'           // NEW: Delegates tasks to stations
  | 'station_staff'       // NEW: Station tablet accounts
  | 'branch_manager'
  | 'branch_staff'
```

Add role metadata:
```typescript
roleDisplayNames: {
  head_chef: 'Head Chef',
  station_staff: 'Station Staff'
}

roleDescriptions: {
  head_chef: 'Delegates production tasks to kitchen stations and monitors progress',
  station_staff: 'Works on assigned production tasks at kitchen station'
}

roleLandingPages: {
  head_chef: '/kitchen/head-chef',
  station_staff: '/kitchen/station'
}
```

#### 1.4 Add Station Assignment to User
**File**: `lib/auth.ts`

Extend User interface:
```typescript
export interface User {
  // ... existing fields
  stationAssignment?: ProductionStation | null  // Which station this user represents
}
```

**Database**: Add `station_assignment` column to `users` table:
```sql
ALTER TABLE users ADD COLUMN station_assignment VARCHAR(50);
```

#### 1.5 Create Station User Accounts

Create 5 user accounts:
1. **head_chef** - Role: `head_chef`, station: null
2. **station_hot** - Role: `station_staff`, station: 'Hot Section' (used by 2 tablets)
3. **station_cold** - Role: `station_staff`, station: 'Cold Section'
4. **station_baker** - Role: `station_staff`, station: 'Baker'
5. **station_butcher** - Role: `station_staff`, station: 'Butcher'

Simple PIN-based authentication for tablets (4-digit codes).

### Phase 2: Head Chef Dashboard

#### 2.1 Create Head Chef Page
**New File**: `app/kitchen/head-chef/page.tsx`

**Features**:
- Week/day selector to choose which schedule to delegate
- Unassigned items list with bulk selection
- Station assignment dropdown/interface
- Station progress overview (4 cards showing completion %)
- Assigned items grouped by station
- Reassignment capability
- Print station task lists

**Layout**:
```
┌─────────────────────────────────────────┐
│ Week: Jan 8-14 [< Prev | Next >]       │
│ Day: Monday Jan 8                       │
├─────────────────────────────────────────┤
│ Station Progress                        │
│ [Hot: 3/12 25%] [Cold: 5/8 62%]       │
│ [Baker: 2/5 40%] [Butcher: 7/10 70%]  │
├─────────────────────────────────────────┤
│ Unassigned Items (18)                  │
│ □ 10kg Cookies      [Assign to ▼]     │
│ □ 20kg Brownies     [Assign to ▼]     │
│ [Bulk Assign Selected]                 │
├─────────────────────────────────────────┤
│ Hot Section (12 items)                 │
│ • Chicken Fajitas 55.6kg [In Progress]│
│ • Beef Paupiette 7kg    [Pending]     │
│   [Reassign]                           │
└─────────────────────────────────────────┘
```

#### 2.2 Create UI Components
**New Files**:
- `components/kitchen/HeadChefAssignmentInterface.tsx` - Assignment UI with multi-select
- `components/kitchen/StationProgressCard.tsx` - Progress card per station (completed/total, %)
- `components/kitchen/UnassignedItemsList.tsx` - List with checkboxes and assignment dropdowns
- `components/kitchen/AssignedItemsByStation.tsx` - Grouped view with reassignment buttons

#### 2.3 Create Assignment API
**New File**: `app/api/production-schedules/[scheduleId]/assign/route.ts`

```typescript
POST /api/production-schedules/[scheduleId]/assign
Body: {
  date: "2024-01-08",
  itemIds: ["prod-002", "prod-007"],
  station: "Hot Section",
  assignedBy: "user-123"
}
Response: { success: true, assigned: 2 }
```

**Authorization**: Only `admin`, `operations_lead`, `head_chef` can assign.

#### 2.4 Real-time Progress Polling
- Poll schedule API every 30 seconds
- Update station progress cards
- Show toast notification when items completed
- Optimistic UI: Show assignment immediately, confirm with API

### Phase 3: Station Tablet Interface

#### 3.1 Create Station Page
**New File**: `app/kitchen/station/page.tsx`

**Features**:
- Shows station name from user's `stationAssignment`
- "My Tasks for Today" list (only items assigned to this station)
- Each task shows: recipe name, target quantity, status, progress
- "Start Task" button (sets `startedAt`)
- "View Recipe" button (opens scaled recipe modal)
- "Mark Complete" button (opens completion form for actual quantity)
- Auto-refresh every 30s for new assignments

**Layout**:
```
┌─────────────────────────────────────────┐
│ Baker Station                           │
│ Monday, January 8, 2026                 │
│ 2 of 5 tasks completed (40%)           │
├─────────────────────────────────────────┤
│ ✓ 10kg Cookies              [COMPLETED]│
│   Actual: 10.2kg                       │
│   [View Recipe]                        │
├─────────────────────────────────────────┤
│ 📋 20kg Brownies           [IN PROGRESS]│
│   Target: 20kg                         │
│   Sub-recipes: 2 of 3 done             │
│   [View Recipe] [Mark Complete]        │
├─────────────────────────────────────────┤
│ 5kg Banana Bread              [PENDING]│
│   Target: 5kg                          │
│   [Start Task] [View Recipe]           │
└─────────────────────────────────────────┘
```

**Mobile Optimization**:
- Large touch targets (44px minimum)
- Large text (16px+ for recipes)
- Full-screen layout (no sidebar)
- Print-friendly task list

#### 3.2 Create Station Components
**New Files**:
- `components/kitchen/StationHeader.tsx` - Station name, date, progress
- `components/kitchen/StationTaskCard.tsx` - Individual task card with actions
- `components/kitchen/TaskCompletionModal.tsx` - Modal for entering actual quantity
- `components/kitchen/RecipeViewModal.tsx` - Full-screen recipe with scaling

#### 3.3 Create Station APIs
**New Files**:
1. `app/api/stations/[station]/tasks/route.ts` - Get tasks for station
```typescript
GET /api/stations/Baker/tasks?date=2024-01-08
Response: {
  station: "Baker",
  date: "2024-01-08",
  tasks: [
    {
      itemId: "prod-004",
      recipeName: "Brownies 1 KG",
      quantity: 20,
      unit: "kg",
      status: "pending",
      recipeId: "brownies-1kg",
      assignedAt: "2024-01-07T20:00:00Z"
    }
  ]
}
```

2. `app/api/production-schedules/[scheduleId]/items/[itemId]/start/route.ts`
```typescript
PATCH - Start working on item
Body: { date: "2024-01-08", startedAt: "2024-01-08T09:00:00Z" }
```

3. `app/api/production-schedules/[scheduleId]/items/[itemId]/complete/route.ts`
```typescript
PATCH - Mark complete
Body: {
  date: "2024-01-08",
  completed: true,
  actualQuantity: 10.2,
  actualUnit: "kg",
  completedAt: "2024-01-08T14:15:00Z"
}
```

4. `app/api/production-schedules/[scheduleId]/items/[itemId]/reassign/route.ts`
```typescript
PATCH - Reassign to different station
Body: {
  date: "2024-01-08",
  newStation: "Cold Section",
  reassignedBy: "user-123"
}
```

**Authorization**:
- Station staff can only access their assigned station
- Verify `session.user.stationAssignment === stationName`
- Head chef and admin can access all stations

### Phase 4: Recipe Integration & Scaling

#### 4.1 Link Production Items to Recipes
**Approach**: Match production item `recipeName` to recipe `name` or `recipeCode`

**API**: Extend station tasks endpoint to include recipe details:
```typescript
GET /api/stations/[station]/tasks
Response: {
  tasks: [
    {
      itemId: "prod-004",
      recipeName: "Brownies 1 KG",
      quantity: 20,
      unit: "kg",
      recipe: {  // Include full recipe data
        recipeId: "brownies-1kg",
        name: "Brownies 1 KG",
        yield: "1 KG",
        ingredients: [...],
        subRecipes: [...]
      }
    }
  ]
}
```

#### 4.2 Scaled Recipe Display
**Modify Component**: `components/YieldScaler.tsx`

Add "locked" mode where target quantity is pre-set and cannot be changed:
```typescript
<YieldScaler
  baseYield={recipe.yield}           // "1 KG"
  initialTarget={item.quantity}      // 20
  targetUnit={item.unit}             // "kg"
  locked={true}                      // Station cannot change target
  onMultiplierChange={(multiplier) => {
    // All recipe quantities auto-scale
  }}
/>
```

#### 4.3 Recipe View Modal
**New Component**: `components/kitchen/RecipeViewModal.tsx`

Full-screen modal for stations showing:
- Recipe tabs (Overview, Ingredients, Preparation, Workflow, etc.)
- Pre-scaled to target quantity
- Workflow tab with sub-recipe checkboxes
- Quality specs
- Equipment requirements
- Print button

### Phase 5: Sub-recipe Workflow Tracking

#### 5.1 Extend WorkflowTab Component
**Modify File**: `components/WorkflowTab.tsx`

Add props:
```typescript
interface WorkflowTabProps {
  recipe: Recipe
  yieldMultiplier?: number
  productionItemId?: string           // NEW
  initialProgress?: SubRecipeProgress // NEW
  onProgressChange?: (progress: SubRecipeProgress) => void  // NEW
}
```

**Features**:
- Each sub-recipe card has checkbox
- Clicking checkbox:
  1. Updates UI immediately
  2. Saves to localStorage (offline support)
  3. Calls `onProgressChange` callback
  4. Syncs to backend
- Show completion timestamp per sub-recipe
- Progress indicator: "2 of 3 sub-recipes completed"

#### 5.2 Sub-recipe Progress API
**New File**: `app/api/production-schedules/[scheduleId]/items/[itemId]/sub-recipe-progress/route.ts`

```typescript
PATCH - Update sub-recipe progress
Body: {
  date: "2024-01-08",
  subRecipeId: "sauce-tomato-1-kg",
  completed: true,
  completedAt: "2024-01-08T10:30:00Z"
}
Response: { success: true, item: {...} }
```

#### 5.3 Offline Support with localStorage
**Strategy**:
1. Save progress to `localStorage` immediately
2. Sync to backend every 30s or on item completion
3. Key: `production-item-${itemId}-progress`
4. On page load, merge localStorage with backend data (backend wins on conflicts)

**Implementation**:
```typescript
const updateSubRecipeProgress = async (subRecipeId: string, completed: boolean) => {
  // 1. Update localStorage
  const storageKey = `production-item-${itemId}-progress`
  const progress = JSON.parse(localStorage.getItem(storageKey) || '{}')
  progress[subRecipeId] = {
    completed,
    completedAt: completed ? new Date().toISOString() : null
  }
  localStorage.setItem(storageKey, JSON.stringify(progress))

  // 2. Sync to backend
  try {
    await fetch(`/api/production-schedules/${scheduleId}/items/${itemId}/sub-recipe-progress`, {
      method: 'PATCH',
      body: JSON.stringify({ date, subRecipeId, completed, completedAt: progress[subRecipeId].completedAt })
    })
  } catch (error) {
    console.error('Will retry on next sync')
  }
}
```

### Phase 6: Authorization & Middleware

#### 6.1 Update Middleware
**Modify File**: `middleware.ts`

Add route protection:
```typescript
const roleRestrictedRoutes: Record<string, string[]> = {
  // ... existing routes
  '/kitchen/head-chef': ['admin', 'operations_lead', 'head_chef'],
  '/kitchen/station': ['admin', 'station_staff'],
}

// Station staff redirect
if (userRole === 'station_staff' && path !== '/kitchen/station' && path !== '/profile') {
  return NextResponse.redirect(new URL('/kitchen/station', req.url))
}

// Head chef redirect
if (userRole === 'head_chef' && path !== '/kitchen/head-chef' && path !== '/profile') {
  return NextResponse.redirect(new URL('/kitchen/head-chef', req.url))
}
```

#### 6.2 API Authorization
Each new API endpoint verifies:
- User is authenticated
- User has required role
- For station endpoints: verify user's `stationAssignment` matches requested station

### Phase 7: Real-time Updates & Polling

#### 7.1 Head Chef Dashboard Polling
```typescript
// Poll every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchSchedule() // Refresh schedule data
  }, 30000)
  return () => clearInterval(interval)
}, [scheduleId])
```

#### 7.2 Station Tablet Polling
```typescript
// Poll every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchTasks() // Refresh task list
  }, 30000)
  return () => clearInterval(interval)
}, [station, date])
```

#### 7.3 Optimistic UI Updates
Both interfaces use optimistic updates:
- Update UI immediately
- Call API in background
- Revert on error with toast notification

### Phase 8: Additional Features

#### 8.1 Print Station Task Lists
**Feature**: Head chef can print task lists for each station

**Implementation**:
```typescript
// Print-friendly component
<div className="hidden print:block">
  <h1>Hot Section Tasks - Monday Jan 8</h1>
  <table>
    {tasks.map(task => (
      <tr>
        <td>□ {task.recipeName}</td>
        <td>{task.quantity} {task.unit}</td>
      </tr>
    ))}
  </table>
</div>
```

**CSS**: Add print media query to hide navigation, show print-only content

#### 8.2 Notifications
- Use existing notification system
- Send notification to head chef when station completes item
- Send notification to station when new items assigned

#### 8.3 Migration Script
**New File**: `scripts/migrate-stations.ts`

Update existing production schedules to new station names:
- 'Butchery' → 'Butcher'
- 'Desserts' → 'Baker'
- 'Pantry' → 'Cold Section'
- 'Hot Section' → 'Hot Section' (unchanged)

## Critical Files to Modify

1. **lib/data.ts** - Update `ProductionStation`, extend `ProductionItem`
2. **lib/auth.ts** - Add `head_chef` and `station_staff` roles, add `stationAssignment` to User
3. **middleware.ts** - Add route protection for new pages
4. **components/WorkflowTab.tsx** - Add production item progress tracking
5. **components/YieldScaler.tsx** - Add locked mode for pre-set targets

## New Files to Create

### Pages
- `app/kitchen/head-chef/page.tsx` - Head chef dashboard
- `app/kitchen/station/page.tsx` - Station tablet interface

### API Routes
- `app/api/production-schedules/[scheduleId]/assign/route.ts`
- `app/api/stations/[station]/tasks/route.ts`
- `app/api/production-schedules/[scheduleId]/items/[itemId]/start/route.ts`
- `app/api/production-schedules/[scheduleId]/items/[itemId]/complete/route.ts`
- `app/api/production-schedules/[scheduleId]/items/[itemId]/reassign/route.ts`
- `app/api/production-schedules/[scheduleId]/items/[itemId]/sub-recipe-progress/route.ts`

### Components
- `components/kitchen/HeadChefAssignmentInterface.tsx`
- `components/kitchen/StationProgressCard.tsx`
- `components/kitchen/StationTaskCard.tsx`
- `components/kitchen/TaskCompletionModal.tsx`
- `components/kitchen/RecipeViewModal.tsx`
- `components/kitchen/StationHeader.tsx`
- `components/kitchen/UnassignedItemsList.tsx`
- `components/kitchen/AssignedItemsByStation.tsx`

### Hooks
- `hooks/useStationTasks.ts` - Fetch tasks with polling
- `hooks/useHeadChefSchedule.ts` - Fetch schedule with polling

## Verification Steps

### End-to-End Test Flow

1. **Setup**:
   - [ ] Create 5 user accounts (1 head chef + 4 station staff)
   - [ ] Assign station to each station staff user
   - [ ] Operations lead creates production schedule for this week

2. **Head Chef Delegation**:
   - [ ] Log in as head chef
   - [ ] Navigate to `/kitchen/head-chef`
   - [ ] Select current week and today
   - [ ] See unassigned items from production schedule
   - [ ] Select multiple items and assign to Baker station
   - [ ] Verify items move from "Unassigned" to "Baker" section
   - [ ] Verify Baker progress card shows "0 of X completed"

3. **Station Receives Tasks**:
   - [ ] Log in as station_baker on tablet
   - [ ] Navigate to `/kitchen/station`
   - [ ] Verify assigned items appear in task list
   - [ ] Verify each task shows recipe name and target quantity

4. **Station Works on Task**:
   - [ ] Click "Start Task" on first item
   - [ ] Verify status changes to "In Progress"
   - [ ] Click "View Recipe"
   - [ ] Verify recipe opens with correct scaled quantities (e.g., 10kg not 1kg)
   - [ ] Verify workflow tab shows sub-recipes with checkboxes

5. **Sub-recipe Tracking**:
   - [ ] Check first sub-recipe as complete
   - [ ] Verify progress updates (e.g., "1 of 3 completed")
   - [ ] Refresh page
   - [ ] Verify sub-recipe still marked complete (persistence works)
   - [ ] Complete all sub-recipes
   - [ ] Verify progress shows "3 of 3 completed"

6. **Complete Task**:
   - [ ] Click "Mark Complete"
   - [ ] Enter actual quantity produced (e.g., 10.2kg)
   - [ ] Submit
   - [ ] Verify task shows as completed with actual quantity

7. **Head Chef Sees Progress**:
   - [ ] Switch to head chef dashboard
   - [ ] Verify Baker progress card updated (e.g., "1 of 5 completed, 20%")
   - [ ] Verify completed item shows actual quantity
   - [ ] Verify notification received

8. **Test Reassignment**:
   - [ ] Head chef reassigns one item from Baker to Cold Section
   - [ ] Verify item disappears from Baker station view
   - [ ] Log in as station_cold
   - [ ] Verify item appears in Cold Section tasks

9. **Test Offline Support**:
   - [ ] Disconnect tablet from network
   - [ ] Mark sub-recipe complete
   - [ ] Reconnect network
   - [ ] Verify progress synced to backend

10. **Test Print**:
    - [ ] Head chef clicks "Print Station Lists"
    - [ ] Verify print preview shows task lists for each station
    - [ ] Verify layout is print-friendly

11. **Test Multiple Hot Section Tablets**:
    - [ ] Log in as station_hot on 2 tablets
    - [ ] Verify both see same task list
    - [ ] Complete item on tablet 1
    - [ ] Verify tablet 2 sees update after polling refresh

## Performance Considerations

- **Polling frequency**: 30 seconds (adjustable based on usage)
- **API caching**: Cache station tasks for 30s with Redis or in-memory
- **Optimistic UI**: Immediate updates before API confirmation
- **localStorage**: Limit to 5MB per station, clear old data
- **Recipe scaling**: Memoize calculations with `useMemo`
- **Virtual scrolling**: Use for long item lists (10+ items)

## Future Enhancements

Post-MVP features to consider:
- Voice input for marking items complete
- Camera integration for batch photos
- Barcode/QR code scanning for recipes
- Predictive completion time estimates
- Smart reassignment suggestions based on load
- Station-to-station messaging
- Weekly batch assignment (assign entire week at once)
- Ingredient pull lists per station
- Quality checkpoint photos
