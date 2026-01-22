// Shared types for kitchen components

export interface StationTask {
  itemId: string
  recipeName: string
  quantity: number
  unit: string
  notes?: string
  station?: string
  assignedAt?: string
  startedAt?: string
  completedAt?: string
  completed?: boolean
  actualQuantity?: number
  actualUnit?: string
  subRecipeProgress?: Record<string, { completed: boolean; completedAt?: string }>
  recipeId?: string
}
