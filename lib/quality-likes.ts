// Constants and types for quality check likes feature

export const QUALITY_LIKE_TAGS = [
  'Excellent Presentation',
  'Great Consistency',
  'Perfect Execution',
  'Outstanding Quality',
  'Attention to Detail'
] as const

export type QualityLikeTag = typeof QUALITY_LIKE_TAGS[number]

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
  currentUserLikeId?: number // ID of current user's like if they've liked
}

export interface CreateLikeRequest {
  note?: string
  tags?: string[]
}

// Validation functions
export function isValidLikeTag(tag: string): tag is QualityLikeTag {
  return QUALITY_LIKE_TAGS.includes(tag as QualityLikeTag)
}

export function validateLikeTags(tags: string[]): boolean {
  return tags.every(tag => isValidLikeTag(tag))
}

export function validateLikeNote(note: string | undefined): boolean {
  if (!note) return true // Note is optional
  return note.length <= 200
}

// Helper to check if user can give likes
export function canGiveLikes(userRole: string | null | undefined): boolean {
  if (!userRole) return false
  return ['admin', 'regional_manager', 'operations_lead'].includes(userRole)
}
