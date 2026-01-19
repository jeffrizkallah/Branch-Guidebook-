import type { PageTour } from '../types'

export const adminTours: PageTour[] = [
  // Admin Dashboard Tour
  {
    tourId: 'admin-dashboard',
    roles: ['admin'],
    pathPattern: '/admin',
    priority: 1,
    steps: [
      {
        id: 'admin-overview',
        targetSelector: '[data-tour-id="admin-stats"]',
        title: '📊 System Overview',
        description: 'These cards show your key metrics at a glance - total users, pending approvals, recipes, and more.',
        position: 'bottom'
      },
      {
        id: 'pending-users',
        targetSelector: '[data-tour-id="pending-users"]',
        title: '👥 Pending Approvals',
        description: 'New user signups appear here. Click to review and approve users with the right role and branch access.',
        position: 'bottom'
      },
      {
        id: 'quick-actions',
        targetSelector: '[data-tour-id="admin-quick-actions"]',
        title: '⚡ Quick Actions',
        description: 'Jump to common tasks like user management, recipes, or notifications from here.',
        position: 'top'
      }
    ]
  },

  // User Management Tour
  {
    tourId: 'admin-users',
    roles: ['admin'],
    pathPattern: '/admin/users',
    priority: 2,
    steps: [
      {
        id: 'user-list',
        targetSelector: '[data-tour-id="user-list"]',
        title: '👥 User Directory',
        description: 'All registered users appear here. You can filter by role or status using the tabs above.',
        position: 'top'
      },
      {
        id: 'user-card',
        targetSelector: '[data-tour-id="user-card"]',
        title: '🎫 User Details',
        description: 'Click any user card to edit their role, assign branches, or reset their password.',
        position: 'right'
      },
      {
        id: 'approve-flow',
        targetSelector: '[data-tour-id="pending-tab"]',
        title: '✅ Approve New Users',
        description: 'The "Pending" tab shows users waiting for approval. Assign them a role and branches to activate their account.',
        position: 'bottom'
      }
    ]
  },

  // Recipes Management Tour
  {
    tourId: 'admin-recipes',
    roles: ['admin'],
    pathPattern: '/admin/recipe-instructions',
    priority: 3,
    steps: [
      {
        id: 'recipe-grid',
        targetSelector: '[data-tour-id="recipe-grid"]',
        title: '🍳 Recipe Library',
        description: 'All recipes are organized by category. Click any recipe to view details or edit.',
        position: 'top'
      },
      {
        id: 'add-recipe',
        targetSelector: '[data-tour-id="add-recipe-btn"]',
        title: '➕ Add New Recipe',
        description: 'Create new recipes here. You can paste from Excel or enter details manually.',
        position: 'left'
      },
      {
        id: 'recipe-categories',
        targetSelector: '[data-tour-id="category-filter"]',
        title: '📂 Filter by Category',
        description: 'Filter recipes by category to find what you need quickly.',
        position: 'bottom'
      }
    ]
  },

  // Notifications Tour
  {
    tourId: 'admin-notifications',
    roles: ['admin'],
    pathPattern: '/admin/notifications',
    priority: 4,
    steps: [
      {
        id: 'create-notification',
        targetSelector: '[data-tour-id="create-notification"]',
        title: '📢 Send Announcements',
        description: 'Create notifications to broadcast to all users or target specific roles.',
        position: 'bottom'
      },
      {
        id: 'notification-history',
        targetSelector: '[data-tour-id="notification-list"]',
        title: '📋 Notification History',
        description: 'See all past notifications and who has read them.',
        position: 'top'
      }
    ]
  }
]

