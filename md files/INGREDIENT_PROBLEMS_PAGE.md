# Ingredient Problems Dedicated Page

## Overview
Created a comprehensive dedicated page for managing ingredient shortages in the Central Kitchen role, while keeping a simplified widget on the dashboard.

## Changes Made

### 1. New Dedicated Page (`app/kitchen/ingredient-problems/page.tsx`)
A full-featured page for managing ingredient shortages with:

#### Features
- **Advanced Filtering System**
  - Search by ingredient name
  - Filter by status (Pending, Resolved, All)
  - Filter by priority (High, Medium, Low)
  - Filter by date (Today, This Week, All Dates)

- **Detailed Stats Dashboard**
  - Total active shortages
  - High priority count
  - Medium priority count
  - Low priority count
  - Resolved count

- **Expandable Shortage Cards**
  - Click to expand/collapse details
  - Full ingredient information
  - Required, Available, and Shortfall quantities
  - Affected recipes list
  - Affected production items list
  - Production date
  - Detection time
  - Resolution details (for resolved items)

- **Priority Grouping**
  - Shortages organized by priority level
  - Color-coded borders (Red for High, Amber for Medium, Blue for Low)
  - Clear visual hierarchy

- **Resolution Management**
  - Full resolution dialog
  - Resolution actions:
    - Ingredients Ordered
    - Already in Stock (Inventory error)
    - Substitution Available
    - Production Rescheduled
    - Cannot Fulfill
  - Resolution notes field
  - Track who resolved and when

- **Auto-refresh**
  - Polls for updates every 30 seconds
  - Manual refresh button available

### 2. Updated Widget (`components/kitchen/InventoryShortageAlertsWidget.tsx`)
- Added "View More Details" button in the header
- Links to the new dedicated page
- Keeps the compact overview on the dashboard
- Shows active count badge

### 3. Navigation Update (`components/RoleSidebar.tsx`)
- Added "Ingredient Problems" navigation item for Central Kitchen role
- Icon: AlertCircle
- Positioned between Home and Recipes
- Quick access from sidebar

## User Journey

### Dashboard Widget View
1. Central Kitchen staff sees the widget on their dashboard
2. Widget shows a quick overview of pending shortages
3. Click "View More Details" button to access full page

### Dedicated Page View
1. Access via:
   - "View More Details" button from widget
   - "Ingredient Problems" link in sidebar navigation
   - Direct URL: `/kitchen/ingredient-problems`

2. Full page features:
   - Search for specific ingredients
   - Filter by status, priority, and date
   - View detailed stats
   - Expand cards to see all affected recipes and items
   - Resolve shortages with detailed tracking

3. Resolution workflow:
   - Click "Resolve Shortage" on any pending item
   - Dialog opens with full details
   - Select resolution action
   - Add notes
   - Submit resolution
   - Item updates and moves to resolved status

## Access Control
- Role-based access through `useAuth` hook
- Allowed roles: admin, operations_lead, central_kitchen
- Protected route with authentication check

## Technical Details
- **Framework**: Next.js 14 (App Router)
- **State Management**: React hooks (useState, useEffect)
- **UI Components**: shadcn/ui
- **Polling**: Auto-refresh every 30 seconds
- **Responsive**: Mobile-friendly design
- **Real-time**: Updates without page reload

## Benefits
1. **Centralized Management**: All ingredient problems in one place
2. **Better Filtering**: Find specific issues quickly
3. **Detailed Tracking**: See all affected items and recipes
4. **Resolution History**: Track how shortages were resolved
5. **Better UX**: Dashboard stays clean, detailed view available when needed
6. **Easy Access**: Multiple entry points (widget, sidebar)

## Future Enhancements (Potential)
- Export shortage reports
- Bulk resolution actions
- Historical trends and analytics
- Notifications for critical shortages
- Integration with ordering systems
- Predictive shortage warnings
