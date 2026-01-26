# Ingredient Problems Page - Table Redesign Implementation Plan

## Overview
Redesign the ingredient problems page from card-based layout to a virtualized table with side drawer details to handle 300+ shortage items efficiently.

## Design Decisions (Approved)
1. **Solution**: Virtualized Table with Side Drawer
2. **Scope**: Display all items (no artificial limiting)
3. **Bulk Actions**: Yes (resolve multiple, export)
4. **Mobile**: Desktop-optimized (minimal mobile usage)
5. **Details**: Keep card-style detailed info in drawer (affected recipes/items)

---

## UI Components Architecture

### 1. Main Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  Header + Stats Cards (unchanged)                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Filters Bar (enhanced)                                             │
├─────────────────────────────────────────────────────────────────────┤
│  Bulk Actions Bar (conditional - shows when items selected)         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────┬──────────────────────────────────┐│
│  │                             │                                  ││
│  │  VIRTUALIZED TABLE          │     SIDE DRAWER (slide-in)      ││
│  │  (Main content)             │     (when item selected)        ││
│  │                             │                                  ││
│  └─────────────────────────────┴──────────────────────────────────┘│
│                                                                      │
│  Pagination Controls                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### A. Table Component Specifications

#### Table Columns (8 columns):

| Column | Width | Sortable | Content |
|--------|-------|----------|---------|
| Select | 40px | No | Checkbox for bulk selection |
| Priority | 80px | Yes | Badge (HIGH/MED/LOW) with color |
| Ingredient Name | 250px | Yes | Primary identifier, bold text |
| Status | 120px | Yes | Badge (Missing/Partial/Critical) |
| Required | 100px | Yes | Quantity with unit |
| Available | 100px | Yes | Quantity with unit |
| Shortfall | 120px | Yes | Negative quantity in red |
| Production Date | 130px | Yes | Formatted date (Jan 30, 2026) |
| Actions | 60px | No | "⋮" menu button |

**Total Table Width**: ~1,000px (comfortable on 1280px+ screens)

#### Row Features:
- **Height**: 56px per row (comfortable reading)
- **Hover State**: Light gray background (#f9fafb)
- **Selected State**: Blue tint background (#eff6ff)
- **Click Behavior**: Click anywhere on row to open drawer
- **Zebra Striping**: Alternating row colors for readability

#### Virtual Scrolling:
- **Library**: `@tanstack/react-virtual` (lightweight, ~10KB)
- **Overscan**: Render 5 extra rows above/below viewport
- **Performance**: Only ~15-20 DOM elements even with 1000+ items
- **Smooth Scrolling**: Native browser scrolling with virtual positioning

#### Sorting:
- **Click Column Header**: Toggle sort direction
- **Visual Indicator**: Arrow icon (↑/↓) in header
- **Multi-sort**: Hold Shift to sort by multiple columns (nice-to-have)
- **Default Sort**: Priority DESC, Production Date ASC

---

### B. Side Drawer Component

#### Drawer Specifications:
- **Width**: 480px (fixed)
- **Position**: Slide in from right
- **Animation**: 300ms ease-in-out
- **Overlay**: Semi-transparent backdrop on left side
- **Close Actions**: 
  - X button in header
  - Click backdrop
  - ESC key
  - Navigate to another row

#### Drawer Content Structure:

```
┌─────────────────────────────────────────────┐
│ [←] [→]  Vacuum Bag 30X40          [X]     │  ← Navigation & Close
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ HIGH | MISSING | Detected: 1m ago      ││  ← Status Badges
│ └─────────────────────────────────────────┘│
│                                             │
│ Production Date                             │
│ ▸ Fri, Jan 30, 2026                        │
│                                             │
│ Quantity Details                            │
│ ┌──────┬──────────┬───────────┐           │
│ │ Req  │ Avail    │ Shortfall │           │
│ │ 422  │ 0.00 GM  │ -422 KG   │           │
│ └──────┴──────────┴───────────┘           │
│                                             │
│ ▼ Affected Recipes (5)                      │
│   • Recipe Name A                          │
│   • Recipe Name B                          │
│   • Recipe Name C                          │
│   • Recipe Name D                          │
│   • Recipe Name E                          │
│                                             │
│ ▼ Affected Production Items (3)            │
│   • Production Item X                      │
│   • Production Item Y                      │
│   • Production Item Z                      │
│                                             │
│ [Resolve Shortage Button - Full Width]     │
│                                             │
└─────────────────────────────────────────────┘
```

#### Drawer Features:
- **Arrow Navigation**: ← → buttons to move between rows without closing
- **Keyboard Support**: Arrow keys work when drawer open
- **Expandable Sections**: Click "Affected Recipes" header to collapse/expand
- **Resolution Button**: Opens modal (keep existing modal)
- **Auto-scroll**: Selected row in table auto-scrolls into view

---

### C. Bulk Actions Component

#### When to Show:
- Appears below filters bar when 1+ rows selected
- Sticky position (stays visible when scrolling)

#### Design:
```
┌────────────────────────────────────────────────────────────────┐
│ ✓ 15 items selected    [Export CSV] [Bulk Resolve] [Clear]   │
└────────────────────────────────────────────────────────────────┘
```

#### Actions:

1. **Export CSV**
   - Downloads CSV with selected shortages
   - Columns: All table columns + affected recipes/items
   - Filename: `shortages_export_2026-01-26.csv`

2. **Bulk Resolve**
   - Opens modal with resolution form
   - Shows count: "Resolving 15 shortages"
   - Apply same resolution to all selected
   - Shows progress bar during batch operation

3. **Clear Selection**
   - Deselect all checkboxes
   - Hide bulk actions bar

#### Select All Feature:
- Checkbox in table header
- "Select All 290 items" (current page/filter)
- "Select All 290 across all pages" option

---

### D. Enhanced Filters

#### Current Filters (Keep):
- Search by ingredient name
- Status tabs (Pending/Resolved/All)
- Priority dropdown
- Date dropdown
- Refresh button

#### New Additions:

1. **Quick Filters** (Chips above table):
   ```
   [🔴 Critical Only] [📅 Today] [📦 Completely Missing] [Clear All]
   ```
   - Click to toggle
   - Can combine multiple
   - Visual active state

2. **Column Visibility Toggle**:
   - Dropdown menu (⚙️ icon near filters)
   - Checkboxes to show/hide columns
   - Save preference to localStorage

3. **Density Toggle**:
   ```
   [Compact] [Comfortable] [Spacious]
   ```
   - Compact: 48px row height
   - Comfortable: 56px row height (default)
   - Spacious: 72px row height

4. **Group By** (nice-to-have):
   - None (flat table)
   - By Production Date
   - By Priority
   - Collapsible groups

---

### E. Pagination

#### Bottom Controls:
```
Showing 1-50 of 290 items    [← Prev]  Page 1 of 6  [Next →]    Go to page: [__]
```

#### Features:
- Show 50 items per page (configurable)
- Page size options: 25, 50, 100, 200
- Jump to page input
- Keyboard: PageUp/PageDown
- URL sync: `?page=2` for shareable links

---

## Technical Implementation

### 1. Dependencies to Add

```json
{
  "@tanstack/react-virtual": "^3.0.1",
  "react-use": "^17.4.2"
}
```

### 2. File Structure

```
app/kitchen/ingredient-problems/
├── page.tsx                          (Main page - refactored)
├── components/
│   ├── ShortagesTable.tsx           (New - Main table component)
│   ├── ShortageDrawer.tsx           (New - Side drawer)
│   ├── BulkActionsBar.tsx           (New - Bulk operations)
│   ├── TableFilters.tsx             (New - Enhanced filters)
│   ├── PaginationControls.tsx      (New - Bottom pagination)
│   └── ResolveModal.tsx             (Extracted from current page)
└── hooks/
    ├── useVirtualScroll.ts          (Virtual scroll logic)
    ├── useTableSort.ts              (Sorting logic)
    └── useBulkActions.ts            (Bulk operations)
```

### 3. State Management

```typescript
// Main page state
const [shortages, setShortages] = useState<Shortage[]>([])
const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
const [sortConfig, setSortConfig] = useState({ column: 'priority', direction: 'desc' })
const [drawerOpen, setDrawerOpen] = useState(false)
const [selectedShortageId, setSelectedShortageId] = useState<string | null>(null)
const [currentPage, setCurrentPage] = useState(1)
const [pageSize, setPageSize] = useState(50)
const [filters, setFilters] = useState({ /* same as current */ })
```

### 4. Performance Optimizations

- **Memoization**: 
  - `useMemo` for filtered/sorted data
  - `React.memo` for table rows
  - `useCallback` for event handlers

- **Virtual Scrolling**:
  - Only render visible rows
  - Reuse DOM elements
  - Smooth scrolling with requestAnimationFrame

- **Debouncing**:
  - Search input (300ms delay)
  - Column resize (if added)

- **Lazy Loading** (future):
  - Server-side pagination
  - Infinite scroll option
  - Background refresh

---

## Migration Strategy

### Phase 1: Build New Components (No Breaking Changes)
- Create new table components
- Keep existing page working
- Test in isolation

### Phase 2: Feature Flag Toggle
- Add URL param: `?view=table` or `?view=cards`
- User can test both versions
- Collect feedback

### Phase 3: Replace Default
- Make table view default
- Remove card view
- Clean up old code

### Phase 4: Polish & Enhancements
- Add keyboard shortcuts guide
- Add column reordering (drag-and-drop)
- Add saved filter presets
- Add table density preferences

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate rows in table |
| `←` `→` | Previous/next item in drawer |
| `Enter` | Open drawer for selected row |
| `Esc` | Close drawer |
| `Space` | Toggle row selection (checkbox) |
| `Ctrl+A` | Select all visible rows |
| `Ctrl+E` | Export selected (or all) |
| `/` | Focus search input |

---

## Responsive Behavior (Desktop-First)

### Desktop (1280px+):
- Full table with all columns
- Drawer 480px wide
- Table adapts to remaining space

### Laptop (1024-1279px):
- Hide "Available" column by default
- Drawer 400px wide
- Horizontal scroll for table if needed

### Tablet (768-1023px):
- Auto-switch to cards view (existing design)
- OR: Show table with minimal columns (Name, Priority, Shortfall)
- Drawer full-width overlay

### Mobile (< 768px):
- Cards view only (keep existing)
- No table view on mobile

---

## Success Metrics

### Performance:
- ✅ Initial render < 200ms (with 300 items)
- ✅ Scroll smoothness: 60fps
- ✅ Drawer open/close: < 300ms animation

### Usability:
- ✅ Can see 10-15 items per screen (vs 2-3 cards)
- ✅ Click to details < 2 clicks
- ✅ Bulk resolve 50 items < 30 seconds
- ✅ Find specific ingredient < 5 seconds

---

## Visual Design Specifications

### Color Palette:
- **High Priority**: Red (#ef4444) background (#fee2e2)
- **Medium Priority**: Amber (#f59e0b) background (#fef3c7)
- **Low Priority**: Blue (#3b82f6) background (#dbeafe)
- **Selected Row**: Blue tint (#eff6ff) border (#3b82f6)
- **Hover Row**: Gray (#f9fafb)

### Typography:
- **Table Headers**: 12px, font-weight 600, uppercase, text-gray-600
- **Table Cells**: 14px, font-weight 400
- **Ingredient Name**: 14px, font-weight 600 (bold)
- **Numbers**: Tabular nums for alignment

### Spacing:
- **Row Height**: 56px (default)
- **Cell Padding**: 16px horizontal, 12px vertical
- **Drawer Padding**: 24px
- **Section Gaps**: 16px between sections

---

## Next Steps

1. **Approve this design plan**
2. **Install dependencies** (@tanstack/react-virtual)
3. **Build components in order**:
   - Step 1: Basic table structure + data display
   - Step 2: Virtual scrolling integration
   - Step 3: Sorting functionality
   - Step 4: Side drawer component
   - Step 5: Row selection + bulk actions
   - Step 6: Enhanced filters
   - Step 7: Pagination
   - Step 8: Polish & testing

4. **Test with real data**
5. **Deploy to staging**
6. **User testing**
7. **Production release**

---

## Questions / Decisions Needed

1. ✅ Should we keep the resolution modal or move it inline in the drawer?
   - **Decision**: Keep modal (familiar workflow)

2. ✅ Default page size: 50 or 100 items?
   - **Decision**: 50 items (faster initial render)

3. ✅ Export format: CSV only or also Excel/PDF?
   - **Decision**: Start with CSV, add Excel later if needed

4. ✅ Should bulk resolve show progress for each item or just overall?
   - **Decision**: Overall progress bar with count (simpler UX)

Ready to start building when approved!
