import { sql } from '@vercel/postgres'
import bcrypt from 'bcryptjs'
import type { ProductionStation } from './data'

// User roles
export type UserRole = 'admin' | 'regional_manager' | 'operations_lead' | 'dispatcher' | 'central_kitchen' | 'head_chef' | 'station_staff' | 'branch_manager' | 'branch_staff'

// User status
export type UserStatus = 'pending' | 'active' | 'inactive' | 'rejected'

// User type
export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  nationality: string | null
  phone: string | null
  role: UserRole | null
  status: UserStatus
  approvedBy: number | null
  approvedAt: Date | null
  rejectedReason: string | null
  createdAt: Date
  updatedAt: Date
  lastLogin: Date | null
  // Station assignment for head_chef and station_staff roles
  stationAssignment: ProductionStation | null
}

// User with branch access
export interface UserWithBranches extends User {
  branches: string[]
}

// Role display names
export const roleDisplayNames: Record<UserRole, string> = {
  admin: 'Admin',
  regional_manager: 'Regional Manager',
  operations_lead: 'Operations Lead',
  dispatcher: 'Dispatcher',
  central_kitchen: 'Central Kitchen',
  head_chef: 'Head Chef',
  station_staff: 'Station Staff',
  branch_manager: 'Branch Manager',
  branch_staff: 'Branch Staff',
}

// Role descriptions
export const roleDescriptions: Record<UserRole, string> = {
  admin: 'Full system access, user management, and all settings',
  regional_manager: 'Regional oversight with sales analytics, quality control, and budget management for all branches',
  operations_lead: 'Recipe management, prep instructions, production schedules, and order approval',
  dispatcher: 'Dispatch management and view all branches',
  central_kitchen: 'CK dashboard and recipe viewing',
  head_chef: 'Delegates production tasks to kitchen stations and monitors progress',
  station_staff: 'Works on assigned production tasks at kitchen station',
  branch_manager: 'Branch dashboard for assigned branches',
  branch_staff: 'Access to assigned branches only',
}

// Role landing pages
export const roleLandingPages: Record<UserRole, string> = {
  admin: '/admin',
  regional_manager: '/regional',
  operations_lead: '/operations',
  dispatcher: '/dispatch',
  central_kitchen: '/kitchen',
  head_chef: '/kitchen/head-chef',
  station_staff: '/kitchen/station',
  branch_manager: '/dashboard',
  branch_staff: '/branch', // Will be redirected to /branch/[assigned-slug]
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT
        id,
        email,
        first_name as "firstName",
        last_name as "lastName",
        nationality,
        phone,
        role,
        status,
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        rejected_reason as "rejectedReason",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login as "lastLogin",
        station_assignment as "stationAssignment"
      FROM users
      WHERE email = ${email.toLowerCase()}
    `
    return result.rows[0] as User || null
  } catch (error) {
    console.error('Error getting user by email:', error)
    return null
  }
}

// Get user by ID
export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await sql`
      SELECT
        id,
        email,
        first_name as "firstName",
        last_name as "lastName",
        nationality,
        phone,
        role,
        status,
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        rejected_reason as "rejectedReason",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login as "lastLogin",
        station_assignment as "stationAssignment"
      FROM users
      WHERE id = ${id}
    `
    return result.rows[0] as User || null
  } catch (error) {
    console.error('Error getting user by id:', error)
    return null
  }
}

// Get user with branch access
export async function getUserWithBranches(userId: number): Promise<UserWithBranches | null> {
  try {
    const user = await getUserById(userId)
    if (!user) return null

    const branchResult = await sql`
      SELECT branch_slug FROM user_branch_access WHERE user_id = ${userId}
    `
    
    return {
      ...user,
      branches: branchResult.rows.map(row => row.branch_slug)
    }
  } catch (error) {
    console.error('Error getting user with branches:', error)
    return null
  }
}

// Create user (signup)
export async function createUser(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  nationality?: string
  phone?: string
}): Promise<{ success: boolean; error?: string; userId?: number }> {
  try {
    // Check if email already exists
    const existing = await getUserByEmail(data.email)
    if (existing) {
      return { success: false, error: 'An account with this email already exists' }
    }

    // Hash password
    const passwordHash = await hashPassword(data.password)

    // Insert user
    const result = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, nationality, phone, status)
      VALUES (
        ${data.email.toLowerCase()}, 
        ${passwordHash}, 
        ${data.firstName}, 
        ${data.lastName}, 
        ${data.nationality || null}, 
        ${data.phone || null},
        'pending'
      )
      RETURNING id
    `

    return { success: true, userId: result.rows[0].id }
  } catch (error) {
    console.error('Error creating user:', error)
    return { success: false, error: 'Failed to create account. Please try again.' }
  }
}

// Authenticate user (login)
export async function authenticateUser(email: string, password: string): Promise<{
  success: boolean;
  error?: string;
  user?: User
}> {
  try {
    // Get user with password hash
    const result = await sql`
      SELECT
        id,
        email,
        password_hash,
        first_name as "firstName",
        last_name as "lastName",
        nationality,
        phone,
        role,
        status,
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        rejected_reason as "rejectedReason",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login as "lastLogin",
        station_assignment as "stationAssignment"
      FROM users
      WHERE email = ${email.toLowerCase()}
    `

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid email or password' }
    }

    const user = result.rows[0]

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' }
    }

    // Update last login
    await sql`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ${user.id}
    `

    // Remove password_hash from returned user
    const { password_hash, ...userWithoutPassword } = user

    return { success: true, user: userWithoutPassword as User }
  } catch (error) {
    console.error('Error authenticating user:', error)
    return { success: false, error: 'Authentication failed. Please try again.' }
  }
}

// Get all users (admin)
export async function getAllUsers(): Promise<UserWithBranches[]> {
  try {
    const result = await sql`
      SELECT
        u.id,
        u.email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.nationality,
        u.phone,
        u.role,
        u.status,
        u.approved_by as "approvedBy",
        u.approved_at as "approvedAt",
        u.rejected_reason as "rejectedReason",
        u.created_at as "createdAt",
        u.updated_at as "updatedAt",
        u.last_login as "lastLogin",
        u.station_assignment as "stationAssignment",
        COALESCE(
          array_agg(uba.branch_slug) FILTER (WHERE uba.branch_slug IS NOT NULL),
          ARRAY[]::VARCHAR[]
        ) as branches
      FROM users u
      LEFT JOIN user_branch_access uba ON u.id = uba.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `
    return result.rows as UserWithBranches[]
  } catch (error) {
    console.error('Error getting all users:', error)
    return []
  }
}

// Get pending users (admin)
export async function getPendingUsers(): Promise<User[]> {
  try {
    const result = await sql`
      SELECT
        id,
        email,
        first_name as "firstName",
        last_name as "lastName",
        nationality,
        phone,
        role,
        status,
        created_at as "createdAt",
        station_assignment as "stationAssignment"
      FROM users
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `
    return result.rows as User[]
  } catch (error) {
    console.error('Error getting pending users:', error)
    return []
  }
}

// Approve user (admin)
export async function approveUser(
  userId: number,
  role: UserRole,
  approvedBy: number,
  branches?: string[],
  stationAssignment?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update user status and role
    await sql`
      UPDATE users
      SET
        status = 'active',
        role = ${role},
        approved_by = ${approvedBy},
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        station_assignment = ${stationAssignment || null}
      WHERE id = ${userId}
    `

    // If branch_manager or branch_staff, assign branches
    // Both roles can now have multiple branches assigned
    if ((role === 'branch_manager' || role === 'branch_staff') && branches && branches.length > 0) {
      for (const branchSlug of branches) {
        await sql`
          INSERT INTO user_branch_access (user_id, branch_slug, assigned_by)
          VALUES (${userId}, ${branchSlug}, ${approvedBy})
          ON CONFLICT (user_id, branch_slug) DO NOTHING
        `
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error approving user:', error)
    return { success: false, error: 'Failed to approve user' }
  }
}

// Reject user (admin)
export async function rejectUser(
  userId: number, 
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`
      UPDATE users 
      SET 
        status = 'rejected', 
        rejected_reason = ${reason},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `
    return { success: true }
  } catch (error) {
    console.error('Error rejecting user:', error)
    return { success: false, error: 'Failed to reject user' }
  }
}

// Update user (admin)
export async function updateUser(
  userId: number,
  data: {
    role?: UserRole
    status?: UserStatus
    branches?: string[]
    stationAssignment?: string | null
  },
  updatedBy: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update role, status, and station_assignment together to avoid constraint violations
    // This is important because the database has a check constraint that requires
    // station_assignment to be set for head_chef and station_staff roles
    if (data.role || data.status || data.stationAssignment !== undefined) {
      // Build the update query based on what's provided
      if (data.stationAssignment !== undefined) {
        // Update all three fields together
        await sql`
          UPDATE users
          SET
            role = COALESCE(${data.role || null}, role),
            status = COALESCE(${data.status || null}, status),
            station_assignment = ${data.stationAssignment},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${userId}
        `
      } else {
        // Only update role and status
        await sql`
          UPDATE users
          SET
            role = COALESCE(${data.role || null}, role),
            status = COALESCE(${data.status || null}, status),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${userId}
        `
      }
    }

    // Update branch access if provided
    if (data.branches !== undefined) {
      // Remove existing branch access
      await sql`DELETE FROM user_branch_access WHERE user_id = ${userId}`

      // Add new branch access
      for (const branchSlug of data.branches) {
        await sql`
          INSERT INTO user_branch_access (user_id, branch_slug, assigned_by)
          VALUES (${userId}, ${branchSlug}, ${updatedBy})
        `
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating user:', error)
    return { success: false, error: 'Failed to update user' }
  }
}

// Reset user password (admin)
export async function resetUserPassword(
  userId: number, 
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const passwordHash = await hashPassword(newPassword)
    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `
    return { success: true }
  } catch (error) {
    console.error('Error resetting password:', error)
    return { success: false, error: 'Failed to reset password' }
  }
}

// Check if user has access to branch
export async function userHasBranchAccess(userId: number, branchSlug: string): Promise<boolean> {
  try {
    const user = await getUserById(userId)
    if (!user) return false

    // Admin, regional_manager, and operations_lead have access to all branches
    if (user.role === 'admin' || user.role === 'regional_manager' || user.role === 'operations_lead') return true

    // Dispatchers can view all branches
    if (user.role === 'dispatcher') return true

    // Central kitchen has access to central-kitchen only
    if (user.role === 'central_kitchen') return branchSlug === 'central-kitchen'

    // Head chef has access to central-kitchen only
    if (user.role === 'head_chef') return branchSlug === 'central-kitchen'

    // Station staff has access to central-kitchen only (they work in central kitchen)
    if (user.role === 'station_staff') return branchSlug === 'central-kitchen'

    // Branch managers and branch staff have access to assigned branches
    if (user.role === 'branch_manager' || user.role === 'branch_staff') {
      const result = await sql`
        SELECT 1 FROM user_branch_access
        WHERE user_id = ${userId} AND branch_slug = ${branchSlug}
      `
      return result.rows.length > 0
    }

    return false
  } catch (error) {
    console.error('Error checking branch access:', error)
    return false
  }
}

// Check if user can edit (vs view-only)
export function userCanEdit(role: UserRole | null, resource: string): boolean {
  if (!role) return false
  
  switch (resource) {
    case 'recipes':
    case 'prep_instructions':
    case 'production_schedules':
      return ['admin', 'operations_lead'].includes(role)
    case 'dispatch':
      return ['admin', 'operations_lead', 'dispatcher', 'central_kitchen'].includes(role)
    case 'users':
      return ['admin', 'dispatcher'].includes(role)
    case 'branches':
      return ['admin', 'operations_lead'].includes(role)
    case 'orders':
      return ['admin', 'operations_lead', 'branch_manager'].includes(role)
    default:
      return false
  }
}

