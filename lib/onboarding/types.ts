import type { UserRole } from '@/lib/auth'

// Position of tooltip relative to target element
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto'

// Single step in a tour
export interface TourStep {
  id: string
  targetSelector: string           // CSS selector for the target element
  title: string                    // Short title with optional emoji
  description: string              // 2-3 sentence description
  position?: TooltipPosition       // Where to show tooltip
  highlightPadding?: number        // Extra padding around highlight (default: 8)
}

// A complete tour for a specific page
export interface PageTour {
  tourId: string                   // Unique ID (e.g., 'dashboard', 'branch-detail')
  roles: UserRole[]                // Which roles see this tour
  pathPattern: string              // URL pattern (e.g., '/dashboard', '/branch/*')
  steps: TourStep[]
  priority?: number                // Lower = shown first if multiple match
}

// Onboarding state stored in database
export interface OnboardingState {
  onboardingCompleted: boolean
  toursCompleted: string[]
  onboardingSkipped: boolean
  onboardingStartedAt: string | null
}

// Welcome modal content varies by role
export interface WelcomeContent {
  greeting: string
  highlights: string[]
  ctaText: string
}

// Role-specific welcome content
export const roleWelcomeContent: Record<UserRole, WelcomeContent> = {
  admin: {
    greeting: "You have full system access",
    highlights: [
      "Manage all users and their permissions",
      "Configure recipes, prep instructions, and schedules",
      "View analytics and system-wide reports"
    ],
    ctaText: "Let's explore your admin tools"
  },
  regional_manager: {
    greeting: "You oversee all regional operations",
    highlights: [
      "View sales analytics across all branches",
      "Monitor quality control and compliance",
      "Plan and optimize budgets with AI assistance"
    ],
    ctaText: "Let's view your regional dashboard"
  },
  operations_lead: {
    greeting: "You oversee all operations",
    highlights: [
      "Manage recipes and prep instructions",
      "Configure production schedules",
      "Monitor all branch performance"
    ],
    ctaText: "Let's see your dashboard"
  },
  dispatcher: {
    greeting: "You manage dispatches",
    highlights: [
      "Create and track dispatch orders",
      "Mark items as packed and shipped",
      "View all branch delivery statuses"
    ],
    ctaText: "Let's check the dispatch board"
  },
  central_kitchen: {
    greeting: "You're at the heart of production",
    highlights: [
      "View today's production needs",
      "Access all recipes and prep guides",
      "Pack dispatches for branches"
    ],
    ctaText: "Let's see what's cooking"
  },
  branch_manager: {
    greeting: "You manage your branch operations",
    highlights: [
      "View your branch's daily performance",
      "Access recipes and role checklists",
      "Track incoming dispatches"
    ],
    ctaText: "Let's view your dashboard"
  },
  branch_staff: {
    greeting: "You're part of the team",
    highlights: [
      "View your branch information",
      "Access role-specific checklists",
      "Find recipes and instructions"
    ],
    ctaText: "Let's see your branch"
  }
}

