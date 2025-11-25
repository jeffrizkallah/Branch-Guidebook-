import branchesData from '@/data/branches.json'
import rolesData from '@/data/roles.json'
import recipesData from '@/data/recipes.json'
import dispatchesData from '@/data/dispatches.json'

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
}

/**
 * Load all branches
 */
export function loadBranches(): Branch[] {
  return branchesData as Branch[]
}

/**
 * Load a single branch by slug
 */
export function loadBranch(slug: string): Branch | undefined {
  const branches = loadBranches()
  return branches.find(branch => branch.slug === slug)
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
export function getUniqueLocations(): string[] {
  const branches = loadBranches()
  const locations = branches.map(b => b.location)
  return Array.from(new Set(locations)).sort()
}

/**
 * Get unique managers from all branches
 */
export function getUniqueManagers(): string[] {
  const branches = loadBranches()
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
export function exportMergedData(): string {
  const branches = loadBranches()
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

