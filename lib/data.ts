import { sql } from '@vercel/postgres'
import rolesData from '@/data/roles.json'
import recipesData from '@/data/recipes.json'
import dispatchesData from '@/data/dispatches.json'
import recipeInstructionsData from '@/data/recipe-instructions.json'
import productionSchedulesData from '@/data/production-schedules.json'

export interface Contact {
  name: string
  role: string
  phone: string
  email: string
}

export interface DeliverySchedule {
  day: string
  time: string
  items: string
}

export interface KPIs {
  salesTarget: string
  wastePct: string
  hygieneScore: string
}

export interface Media {
  photos: string[]
  videos: string[]
}

export interface Branch {
  id: string
  slug: string
  name: string
  branchType?: 'production' | 'service'  // production = Central Kitchen, service = regular branches
  school: string
  location: string
  manager: string
  contacts: Contact[]
  operatingHours: string
  deliverySchedule: DeliverySchedule[]
  kpis: KPIs
  roles: string[]
  media: Media
}

export interface DailyFlowItem {
  time: string
  action: string
  owner: string
  hint: string
}

export interface DailyFlow {
  morning: DailyFlowItem[]
  preLunch: DailyFlowItem[]
  service: DailyFlowItem[]
  postLunch: DailyFlowItem[]
  closeout: DailyFlowItem[]
}

export interface ChecklistItem {
  id: string
  task: string
  critical: boolean
}

export interface Checklists {
  opening: ChecklistItem[]
  service: ChecklistItem[]
  closing: ChecklistItem[]
}

export interface Role {
  roleId: string
  name: string
  description: string
  responsibilities: string[]
  dailyFlow: DailyFlow
  checklists: Checklists
  dos: string[]
  donts: string[]
}

export interface Ingredient {
  item: string
  quantity: string
  notes?: string
  unit?: string
}

export interface PreparationStep {
  step: number
  instruction: string
  time: string
  critical: boolean
  hint?: string
}

export interface PresentationInstruction {
  step: string
  notes?: string
}

export interface Presentation {
  description: string
  instructions: PresentationInstruction[]
  photos: string[]
}

export interface SOPs {
  foodSafetyAndHygiene: string[]
  cookingStandards: string[]
  storageAndHolding: string[]
  qualityStandards: string[]
}

export interface TroubleshootingItem {
  problem: string
  solutions: string[]
}

// New interfaces for sub-recipes and enhanced recipe structure
export interface MainIngredient {
  name: string
  quantity: number
  unit: string
  specifications?: string
  subRecipeId?: string
}

export interface SubRecipe {
  subRecipeId: string
  name: string
  yield: string
  ingredients: Ingredient[]
  preparation?: PreparationStep[]
  notes?: string
  requiredMachinesTools?: MachineToolRequirement[]
  qualitySpecifications?: QualitySpecification[]
  packingLabeling?: PackingLabeling
}

export interface MachineToolRequirement {
  name: string
  purpose: string
  specifications?: string
  setting?: string
  notes?: string
}

export interface QualitySpecification {
  // Legacy fields (kept for backwards compatibility)
  aspect?: string
  specification?: string
  checkMethod?: string
  parameter?: string  // Maps to appearance in display
  // Simplified fields for new editor
  appearance?: string
  texture?: string
  tasteFlavorProfile?: string
  aroma?: string
}

export interface PackingLabeling {
  packingType: string
  serviceItems: string[]
  labelRequirements: string
  storageCondition: string
  shelfLife: string
}

export interface Recipe {
  recipeId: string
  name: string
  category: string
  station?: string
  recipeCode?: string
  yield?: string
  daysAvailable: string[]
  prepTime: string
  cookTime: string
  servings: string
  
  // Legacy ingredients (for backward compatibility)
  ingredients: Ingredient[]
  
  // New structured ingredients
  mainIngredients?: MainIngredient[]
  subRecipes?: SubRecipe[]
  
  preparation: PreparationStep[]
  
  // New fields
  requiredMachinesTools?: MachineToolRequirement[]
  qualitySpecifications?: QualitySpecification[]
  packingLabeling?: PackingLabeling
  
  presentation: Presentation
  sops: SOPs
  troubleshooting: TroubleshootingItem[]
  allergens: string[]
  storageInstructions: string
}

export interface DispatchItem {
  id: string
  name: string
  orderedQty: number
  packedQty: number | null      // Quantity packed at kitchen
  receivedQty: number | null    // Quantity received at branch
  unit: string
  packedChecked: boolean        // Checked during packing
  receivedChecked: boolean      // Checked during receiving
  notes: string
  issue: 'missing' | 'damaged' | 'partial' | 'shortage' | null
  
  // Late addition fields (for items added after dispatch creation)
  addedLate?: boolean           // Flag for items added after dispatch creation
  addedAt?: string              // ISO timestamp when added
  addedBy?: string              // Who added it (Dispatcher name/email)
  addedReason?: string          // Reason for late addition
  
  // Follow-up resolution tracking (for items with issues)
  resolutionStatus?: 'unresolved' | 'scheduled' | 'resolved'
  resolvedByDispatchId?: string   // Which follow-up dispatch resolved this issue
  resolvedAt?: string             // ISO timestamp when resolved
  
  // For follow-up items - link back to original
  originalDispatchId?: string     // Parent dispatch this item is resolving
  originalItemId?: string         // Original item ID this is a follow-up for
  originalIssue?: string          // What the original issue was
}

export interface BranchDispatch {
  branchSlug: string
  branchName: string
  status: 'pending' | 'packing' | 'dispatched' | 'receiving' | 'completed'
  items: DispatchItem[]
  
  // Packing checkpoint
  packedBy: string | null
  packingStartedAt: string | null
  packingCompletedAt: string | null
  
  // Receiving checkpoint
  receivedBy: string | null
  receivingStartedAt: string | null
  receivedAt: string | null
  completedAt: string | null
  overallNotes: string
}

export interface Dispatch {
  id: string
  createdDate: string
  deliveryDate: string
  createdBy: string
  branchDispatches: BranchDispatch[]
  
  // Follow-up dispatch relationship
  type: 'primary' | 'follow_up'
  parentDispatchId?: string       // Only for follow-ups - links to original dispatch
  followUpDispatchIds?: string[]  // List of follow-up dispatches created from this
}

// Helper to convert database row to Branch type
function rowToBranch(row: any): Branch {
  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    branchType: row.branch_type,
    school: row.school || '',
    location: row.location,
    manager: row.manager,
    contacts: row.contacts || [],
    operatingHours: row.operating_hours || '',
    deliverySchedule: row.delivery_schedule || [],
    kpis: row.kpis || { salesTarget: '', wastePct: '', hygieneScore: '' },
    roles: row.roles || [],
    media: row.media || { photos: [], videos: [] }
  }
}

/**
 * Load all branches from database
 */
export async function loadBranches(): Promise<Branch[]> {
  try {
    const result = await sql`SELECT * FROM branches ORDER BY name ASC`
    return result.rows.map(rowToBranch)
  } catch (error) {
    console.error('Error loading branches from database:', error)
    return []
  }
}

/**
 * Load a single branch by slug from database
 */
export async function loadBranch(slug: string): Promise<Branch | undefined> {
  try {
    const result = await sql`SELECT * FROM branches WHERE slug = ${slug}`
    if (result.rows.length === 0) return undefined
    return rowToBranch(result.rows[0])
  } catch (error) {
    console.error('Error loading branch from database:', error)
    return undefined
  }
}

/**
 * Load all roles
 */
export function loadRoles(): Role[] {
  return rolesData as Role[]
}

/**
 * Get a single role by roleId
 */
export function getRole(roleId: string): Role | undefined {
  const roles = loadRoles()
  return roles.find(role => role.roleId === roleId)
}

/**
 * Get unique locations from all branches
 */
export async function getUniqueLocations(): Promise<string[]> {
  const branches = await loadBranches()
  const locations = branches.map(b => b.location)
  return Array.from(new Set(locations)).sort()
}

/**
 * Get unique managers from all branches
 */
export async function getUniqueManagers(): Promise<string[]> {
  const branches = await loadBranches()
  const managers = branches.map(b => b.manager)
  return Array.from(new Set(managers)).sort()
}

/**
 * Filter branches by search query
 */
export function filterBranches(
  branches: Branch[],
  query: string,
  filters: {
    location?: string
    manager?: string
    minHygieneScore?: number
  }
): Branch[] {
  return branches.filter(branch => {
    // Search query filter
    if (query) {
      const searchLower = query.toLowerCase()
      const matchesSearch =
        branch.name.toLowerCase().includes(searchLower) ||
        branch.school.toLowerCase().includes(searchLower) ||
        branch.location.toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false
    }

    // Location filter
    if (filters.location && filters.location !== 'all') {
      if (branch.location !== filters.location) return false
    }

    // Manager filter
    if (filters.manager && filters.manager !== 'all') {
      if (branch.manager !== filters.manager) return false
    }

    // Hygiene score filter
    if (filters.minHygieneScore) {
      const score = parseInt(branch.kpis.hygieneScore)
      if (score < filters.minHygieneScore) return false
    }

    return true
  })
}

/**
 * Merge localStorage overrides with original data (for edit mode)
 */
export function mergeLocalOverrides<T>(originalData: T, storageKey: string): T {
  if (typeof window === 'undefined') return originalData

  try {
    const overrides = localStorage.getItem(storageKey)
    if (!overrides) return originalData

    const parsedOverrides = JSON.parse(overrides)
    return { ...originalData, ...parsedOverrides }
  } catch (error) {
    console.error('Error merging localStorage overrides:', error)
    return originalData
  }
}

/**
 * Save data overrides to localStorage (for edit mode)
 */
export function saveToLocalStorage(key: string, data: any): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

/**
 * Get all localStorage overrides for export
 */
export function getAllOverrides(): Record<string, any> {
  if (typeof window === 'undefined') return {}

  const overrides: Record<string, any> = {}
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('branch_') || key.startsWith('role_'))) {
        const value = localStorage.getItem(key)
        if (value) {
          overrides[key] = JSON.parse(value)
        }
      }
    }
  } catch (error) {
    console.error('Error getting overrides:', error)
  }

  return overrides
}

/**
 * Export merged data as JSON (for edit mode copy function)
 */
export async function exportMergedData(): Promise<string> {
  const branches = await loadBranches()
  const roles = loadRoles()
  
  const mergedBranches = branches.map(branch => 
    mergeLocalOverrides(branch, `branch_${branch.slug}`)
  )
  
  const mergedRoles = roles.map(role => 
    mergeLocalOverrides(role, `role_${role.roleId}`)
  )

  return JSON.stringify(
    {
      branches: mergedBranches,
      roles: mergedRoles,
      exportDate: new Date().toISOString(),
    },
    null,
    2
  )
}

/**
 * Load all recipes
 */
export function loadRecipes(): Recipe[] {
  return recipesData as Recipe[]
}

/**
 * Get a single recipe by recipeId
 */
export function getRecipe(recipeId: string): Recipe | undefined {
  const recipes = loadRecipes()
  return recipes.find(recipe => recipe.recipeId === recipeId)
}

/**
 * Get recipes available for a specific day
 */
export function getRecipesForDay(day: string): Recipe[] {
  const recipes = loadRecipes()
  return recipes.filter(recipe => 
    recipe.daysAvailable.includes(day)
  )
}

/**
 * Get recipes by category
 */
export function getRecipesByCategory(category: string): Recipe[] {
  const recipes = loadRecipes()
  return recipes.filter(recipe => recipe.category === category)
}

/**
 * Get unique days from all recipes
 */
export function getUniqueDays(): string[] {
  const recipes = loadRecipes()
  const daysSet = new Set<string>()
  recipes.forEach(recipe => {
    recipe.daysAvailable.forEach(day => daysSet.add(day))
  })
  return Array.from(daysSet).sort((a, b) => {
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return dayOrder.indexOf(a) - dayOrder.indexOf(b)
  })
}

/**
 * Get unique categories from all recipes
 */
export function getUniqueCategories(): string[] {
  const recipes = loadRecipes()
  const categories = recipes.map(r => r.category)
  return Array.from(new Set(categories)).sort()
}

/**
 * Load all dispatches
 */
export function loadDispatches(): Dispatch[] {
  return dispatchesData as Dispatch[]
}

/**
 * Get a single dispatch by ID
 */
export function getDispatch(id: string): Dispatch | undefined {
  const dispatches = loadDispatches()
  return dispatches.find(dispatch => dispatch.id === id)
}

/**
 * Get dispatches for a specific branch
 */
export function getDispatchesForBranch(branchSlug: string): BranchDispatch[] {
  const dispatches = loadDispatches()
  const branchDispatches: BranchDispatch[] = []
  
  dispatches.forEach(dispatch => {
    const branchDispatch = dispatch.branchDispatches.find(
      bd => bd.branchSlug === branchSlug
    )
    if (branchDispatch) {
      branchDispatches.push({
        ...branchDispatch,
        // Add parent dispatch info for context
        id: dispatch.id,
        deliveryDate: dispatch.deliveryDate,
        createdDate: dispatch.createdDate,
      } as any)
    }
  })
  
  return branchDispatches
}

/**
 * Get pending dispatches for a branch (needs packing)
 */
export function getPendingDispatchesForBranch(branchSlug: string): BranchDispatch[] {
  return getDispatchesForBranch(branchSlug).filter(
    d => d.status === 'pending' || d.status === 'packing'
  )
}

/**
 * Get dispatched dispatches for a branch (needs receiving)
 */
export function getDispatchedDispatchesForBranch(branchSlug: string): BranchDispatch[] {
  return getDispatchesForBranch(branchSlug).filter(
    d => d.status === 'dispatched' || d.status === 'receiving'
  )
}

/**
 * Get completed dispatches for a branch
 */
export function getCompletedDispatchesForBranch(branchSlug: string): BranchDispatch[] {
  return getDispatchesForBranch(branchSlug).filter(d => d.status === 'completed')
}

/**
 * Get dispatch statistics
 */
export function getDispatchStats() {
  const dispatches = loadDispatches()
  const allBranchDispatches = dispatches.flatMap(d => d.branchDispatches)
  
  return {
    total: allBranchDispatches.length,
    pending: allBranchDispatches.filter(bd => bd.status === 'pending' || bd.status === 'packing').length,
    dispatched: allBranchDispatches.filter(bd => bd.status === 'dispatched' || bd.status === 'receiving').length,
    completed: allBranchDispatches.filter(bd => bd.status === 'completed').length,
    withIssues: allBranchDispatches.filter(bd => 
      bd.items.some(item => item.issue !== null)
    ).length,
  }
}

// ==========================================
// Recipe Instructions (Branch Reheating/Assembly)
// ==========================================

export interface InstructionComponent {
  componentId: string
  subRecipeName: string
  servingPerPortion: number
  unit: string
  reheatingSteps: string[]
  quantityControlNotes: string
  presentationGuidelines: string
}

export interface RecipeInstruction {
  instructionId: string
  dishName: string
  linkedRecipeId?: string  // Links to Central Kitchen recipe if exists
  category: string
  daysAvailable: string[]
  components: InstructionComponent[]
  visualPresentation: string[]
  branchManagerFeedback: string
}

/**
 * Load all recipe instructions
 */
export function loadRecipeInstructions(): RecipeInstruction[] {
  return recipeInstructionsData as RecipeInstruction[]
}

/**
 * Get a single recipe instruction by ID
 */
export function getRecipeInstruction(instructionId: string): RecipeInstruction | undefined {
  const instructions = loadRecipeInstructions()
  return instructions.find(i => i.instructionId === instructionId)
}

/**
 * Get recipe instructions available for a specific day
 */
export function getRecipeInstructionsForDay(day: string): RecipeInstruction[] {
  const instructions = loadRecipeInstructions()
  return instructions.filter(i => i.daysAvailable.includes(day))
}

/**
 * Get recipe instructions by category
 */
export function getRecipeInstructionsByCategory(category: string): RecipeInstruction[] {
  const instructions = loadRecipeInstructions()
  return instructions.filter(i => i.category === category)
}

/**
 * Get unique days from all recipe instructions
 */
export function getUniqueInstructionDays(): string[] {
  const instructions = loadRecipeInstructions()
  const daysSet = new Set<string>()
  instructions.forEach(i => {
    i.daysAvailable.forEach(day => daysSet.add(day))
  })
  return Array.from(daysSet).sort((a, b) => {
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return dayOrder.indexOf(a) - dayOrder.indexOf(b)
  })
}

/**
 * Get unique categories from all recipe instructions
 */
export function getUniqueInstructionCategories(): string[] {
  const instructions = loadRecipeInstructions()
  const categories = instructions.map(i => i.category)
  return Array.from(new Set(categories)).sort()
}

// ==========================================
// Production Schedule (Central Kitchen)
// ==========================================

export type ProductionStation = 'Butchery' | 'Hot Section' | 'Pantry' | 'Desserts'

export interface ProductionItem {
  itemId: string
  recipeName: string
  quantity: number
  unit: string
  station: ProductionStation
  notes: string
  completed: boolean
}

export interface ProductionDay {
  date: string
  dayName: string
  items: ProductionItem[]
}

export interface ProductionSchedule {
  scheduleId: string
  weekStart: string
  weekEnd: string
  createdBy: string
  createdAt: string
  days: ProductionDay[]
}

/**
 * Load all production schedules
 */
export function loadProductionSchedules(): ProductionSchedule[] {
  return productionSchedulesData as ProductionSchedule[]
}

/**
 * Get a single production schedule by ID
 */
export function getProductionSchedule(scheduleId: string): ProductionSchedule | undefined {
  const schedules = loadProductionSchedules()
  return schedules.find(s => s.scheduleId === scheduleId)
}

/**
 * Get the current week's production schedule
 */
export function getCurrentWeekSchedule(): ProductionSchedule | undefined {
  const schedules = loadProductionSchedules()
  const today = new Date()
  
  return schedules.find(schedule => {
    const weekStart = new Date(schedule.weekStart)
    const weekEnd = new Date(schedule.weekEnd)
    return today >= weekStart && today <= weekEnd
  })
}

/**
 * Get production items for a specific date
 */
export function getProductionItemsForDate(date: string): ProductionItem[] {
  const schedules = loadProductionSchedules()
  
  for (const schedule of schedules) {
    const day = schedule.days.find(d => d.date === date)
    if (day) {
      return day.items
    }
  }
  
  return []
}

/**
 * Get production items by station for a specific date
 */
export function getProductionItemsByStation(date: string, station: ProductionStation): ProductionItem[] {
  const items = getProductionItemsForDate(date)
  return items.filter(item => item.station === station)
}

/**
 * Get all unique stations from production schedules
 */
export function getUniqueStations(): ProductionStation[] {
  return ['Butchery', 'Hot Section', 'Pantry', 'Desserts']
}

/**
 * Check if a branch is Central Kitchen (production type)
 */
export function isCentralKitchen(branch: Branch): boolean {
  return branch.branchType === 'production' || branch.slug === 'central-kitchen'
}

/**
 * Get all service branches (excluding Central Kitchen)
 */
export async function getServiceBranches(): Promise<Branch[]> {
  const branches = await loadBranches()
  return branches.filter(b => !isCentralKitchen(b))
}

