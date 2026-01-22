# Quality Check "Like" Feature Implementation

## Overview
Add a "Like" feature to quality control submissions allowing managers to give positive recognition to staff for excellent work.

## Specifications

### Terminology & Visual
- **Feature Name**: Like
- **Icon**: 👍 (Thumbs Up)
- **Color Scheme**: Blue (`bg-blue-500`, `text-blue-600`)
- **Button Text**: "Like" or just 👍 in compact views

### Permissions
**Who can give likes:**
- Admin
- Operations Lead
- Regional Manager

**Who receives likes:**
- Anyone who submitted the quality check (branch staff or branch managers)

### Core Features
1. **One like per manager per submission** - Prevents spam
2. **Optional note** - 50-200 characters (e.g., "Perfect presentation!")
3. **Pre-defined tags** - Select multiple:
   - "Excellent Presentation"
   - "Great Consistency"
   - "Perfect Execution"
   - "Outstanding Quality"
   - "Attention to Detail"
4. **Unlike capability** - Managers can remove their like
5. **Visibility** - Like count shown on submission cards and detail modal
6. **Notifications** - Celebratory notification sent to submitter

---

## Database Schema

### Table: `quality_likes`

```sql
CREATE TABLE quality_likes (
  id SERIAL PRIMARY KEY,
  quality_check_id INTEGER NOT NULL REFERENCES quality_checks(id) ON DELETE CASCADE,
  given_by INTEGER NOT NULL REFERENCES users(id),
  note TEXT CHECK (LENGTH(note) <= 200),
  tags JSONB DEFAULT '[]'::jsonb, -- Array of selected tag strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate likes from same person
  UNIQUE(quality_check_id, given_by)
);

CREATE INDEX idx_quality_likes_check_id ON quality_likes(quality_check_id);
CREATE INDEX idx_quality_likes_given_by ON quality_likes(given_by);
CREATE INDEX idx_quality_likes_created_at ON quality_likes(created_at);
```

### Available Tags
- "Excellent Presentation"
- "Great Consistency"
- "Perfect Execution"
- "Outstanding Quality"
- "Attention to Detail"

---

## API Endpoints

### 1. POST `/api/quality-checks/[id]/like`
**Purpose**: Add a like to a quality check

**Request Body**:
```json
{
  "note": "Perfect presentation!", // Optional, max 200 chars
  "tags": ["Excellent Presentation", "Attention to Detail"] // Optional array
}
```

**Response**:
```json
{
  "success": true,
  "like": {
    "id": 123,
    "qualityCheckId": 456,
    "givenBy": 789,
    "note": "Perfect presentation!",
    "tags": ["Excellent Presentation"],
    "createdAt": "2026-01-22T10:30:00Z"
  }
}
```

**Permissions**: Admin, Operations Lead, Regional Manager
**Validation**:
- User cannot like their own submission
- User can only like once per submission
- Note max 200 characters
- Tags must be from predefined list

### 2. DELETE `/api/quality-checks/[id]/like`
**Purpose**: Remove a like from a quality check

**Response**:
```json
{
  "success": true,
  "message": "Like removed"
}
```

**Permissions**: Only the user who gave the like can remove it

### 3. GET `/api/quality-checks/[id]/likes`
**Purpose**: Get all likes for a quality check

**Response**:
```json
{
  "likes": [
    {
      "id": 123,
      "qualityCheckId": 456,
      "givenBy": 789,
      "givenByName": "Sarah Martinez",
      "givenByRole": "admin",
      "note": "Perfect presentation!",
      "tags": ["Excellent Presentation", "Attention to Detail"],
      "createdAt": "2026-01-22T10:30:00Z"
    }
  ],
  "userHasLiked": false, // Whether current user has liked this
  "totalLikes": 1
}
```

**Permissions**: 
- Submitter can see all likes on their submissions
- Managers can see all likes on any submission

---

## UI Components

### 1. Submission Cards (List View)
```
┌──────────────────────────────────┐
│ 🥐 Croissant - Dubai Marina      │
│ Taste: 5/5  Appearance: 4/5      │
│ 👍 3  💬 1                       │ ← Shows like and feedback count
└──────────────────────────────────┘
```

**Changes**:
- Add like count badge next to feedback count
- Blue color for like count
- Clickable to open detail modal

### 2. Detail Modal - Like Section
```
┌────────────────────────────────────────┐
│ Quality Scores                         │
│ Taste: 5/5  Appearance: 5/5            │
│                                        │
│ [👍 Like (3)] [💬 Give Feedback]      │ ← Action buttons
│                                        │
│ 👍 Liked by 3 managers                │ ← Show who liked
│ ┌──────────────────────────────────┐  │
│ │ 👍 Sarah M. • 2h ago             │  │
│ │    "Perfect plating!"            │  │
│ │    ✨ Excellent Presentation     │  │
│ │    ✨ Attention to Detail        │  │
│ └──────────────────────────────────┘  │
│ ┌──────────────────────────────────┐  │
│ │ 👍 Ahmed K. • 5h ago             │  │
│ │    "Great work!"                 │  │
│ │    ✨ Outstanding Quality        │  │
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**For managers viewing:**
- Button shows "👍 Like" if not yet liked
- Button shows "👍 Liked (3)" with filled state if already liked
- Click to open like modal

**For submitters viewing:**
- Button shows "👍 3 Likes" (view only, grayed out)
- Can see all likes received

### 3. Like Modal (When manager clicks "Like")
```
┌─────────────────────────────────────┐
│ 👍 Like John Smith's Submission     │
│                                      │
│ What stood out? (optional)           │
│ ┌────────────────────────────────┐  │
│ │ [✓] Excellent Presentation     │  │
│ │ [✓] Great Consistency          │  │
│ │ [ ] Perfect Execution          │  │
│ │ [ ] Outstanding Quality        │  │
│ │ [ ] Attention to Detail        │  │
│ └────────────────────────────────┘  │
│                                      │
│ Add a note: (optional, max 200)     │
│ ┌────────────────────────────────┐  │
│ │ "Perfect presentation! The     │  │
│ │  attention to detail shows."   │  │
│ └────────────────────────────────┘  │
│ 0/200 characters                    │
│                                      │
│ [Cancel] [👍 Like This]             │
└─────────────────────────────────────┘
```

### 4. Notification (Sent to Submitter)
```
Title: 🎉 Your submission was liked!

Preview: Sarah Martinez liked your Croissant quality check

Content:
## Quality Check Liked! 👍

**Product:** Croissant (Breakfast, Dubai Marina)

**Liked by:** Sarah Martinez (Admin)

**Tags:**
✨ Excellent Presentation
✨ Attention to Detail

**Note:**
"Perfect presentation! The attention to detail really shows. Keep up the great work!"

---
*View the full quality check to see all likes and feedback.*
```

---

## Analytics Integration

### Dashboard Metrics

#### 1. Recognition Stats Widget
```
┌─────────────────────────────────┐
│ 👍 Recognition This Month       │
│                                  │
│ Total Likes: 156                │
│ Most Liked: Ahmed S. (12 likes) │
│ Like Rate: 34% of submissions   │
└─────────────────────────────────┘
```

#### 2. Top Performers Widget
```
┌─────────────────────────────────┐
│ 🏆 Top Performers (This Month)  │
│                                  │
│ 1. 🥇 Ahmed S. - 12 likes       │
│ 2. 🥈 Fatima K. - 10 likes      │
│ 3. 🥉 Sarah M. - 8 likes        │
└─────────────────────────────────┘
```

#### 3. Most Common Tags
```
Top Recognition Tags:
1. Excellent Presentation (45 times)
2. Outstanding Quality (32 times)
3. Attention to Detail (28 times)
```

### Quality Analytics Enhancement

Add like data to existing quality analytics:
- Correlation between scores and likes
- Branches with most recognition
- Recognition trends over time

---

## Implementation Steps

### Phase 1: Database & Backend
1. ✅ Create migration script: `scripts/create-quality-likes-table.ts`
2. ✅ Create API route: `app/api/quality-checks/[id]/like/route.ts`
3. ✅ Create API route: `app/api/quality-checks/[id]/likes/route.ts`

### Phase 2: UI Components
1. ✅ Update `QualityCheckDetailModal.tsx`:
   - Add like button
   - Show likes section
   - Create like modal
2. ✅ Update quality control pages:
   - Show like count on cards
   - Update filters to include like data
3. ✅ Create `LikeModal.tsx` component for giving likes

### Phase 3: Notifications
1. ✅ Send notification when someone receives a like
2. ✅ Update notification display to handle like notifications

### Phase 4: Analytics
1. ✅ Create dashboard widgets for like metrics
2. ✅ Update quality analytics to include like data

---

## Technical Notes

### Predefined Tags Constant
```typescript
// lib/quality-likes.ts
export const QUALITY_LIKE_TAGS = [
  'Excellent Presentation',
  'Great Consistency',
  'Perfect Execution',
  'Outstanding Quality',
  'Attention to Detail'
] as const

export type QualityLikeTag = typeof QUALITY_LIKE_TAGS[number]
```

### Type Definitions
```typescript
// types/quality-likes.ts
export interface QualityLike {
  id: number
  qualityCheckId: number
  givenBy: number
  givenByName: string
  givenByRole: string
  note?: string
  tags: string[]
  createdAt: string
}

export interface LikesSummary {
  likes: QualityLike[]
  userHasLiked: boolean
  totalLikes: number
}
```

---

## Testing Checklist

### Functional Tests
- [ ] Manager can like a submission
- [ ] Manager cannot like same submission twice
- [ ] Manager cannot like their own submission
- [ ] Manager can unlike a submission
- [ ] Submitter receives notification when liked
- [ ] Like count displays correctly on cards
- [ ] Tags and notes save correctly
- [ ] Only valid tags are accepted

### Permission Tests
- [ ] Only admin/operations_lead/regional_manager can like
- [ ] Branch staff cannot like submissions
- [ ] Users can only unlike their own likes

### UI Tests
- [ ] Like button shows correct state
- [ ] Like modal opens and closes properly
- [ ] Character count works on note field
- [ ] Tags are selectable and deselectable
- [ ] Mobile responsive design works

### Edge Cases
- [ ] Deleted user's likes still display
- [ ] Deleted quality check cascades to likes
- [ ] Long notes truncate properly
- [ ] Empty notes and tags handled correctly

---

## Future Enhancements (Phase 2+)

1. **Gamification**
   - Monthly "Star Performer" badge
   - Achievement milestones (5 likes, 10 likes, 25 likes)
   
2. **Advanced Analytics**
   - Like patterns by product type
   - Time-of-day recognition trends
   - Manager recognition behavior analysis

3. **Team Features**
   - Branch-level recognition leaderboards
   - Cross-branch recognition comparisons
   - Monthly recognition reports

4. **Notification Enhancements**
   - Weekly digest: "You received 5 likes this week!"
   - Milestone notifications: "You've received 25 likes!"

---

## Color Scheme

- **Like Button (Not Liked)**: Gray border, blue on hover
- **Like Button (Liked)**: Blue background, white text
- **Like Count Badge**: Blue background
- **Like Section**: Light blue background for distinction
- **Tags**: Small blue badges with light blue background

---

## Success Metrics

**Week 1 Goals:**
- 20% of eligible submissions receive at least one like
- 50% of managers give at least one like
- 0 reported bugs or issues

**Month 1 Goals:**
- 35% of submissions receive likes
- Average 1.5 likes per liked submission
- 80% of managers actively using feature
- Positive feedback from staff on morale boost

---

## Implementation Date
January 22, 2026

## Status
🟡 Ready to Build
