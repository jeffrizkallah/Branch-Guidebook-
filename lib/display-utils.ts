/**
 * Utility functions for displaying quantities in user-friendly formats
 */

/**
 * Convert large quantities to more readable units
 * GM -> KG when >= 1000 GM
 * ML -> L when >= 1000 ML
 */
export function formatQuantity(quantity: number | null | undefined, unit: string): { value: string; unit: string } {
  // Handle null/undefined quantities
  if (quantity === null || quantity === undefined || isNaN(quantity)) {
    return {
      value: '0.00',
      unit: unit?.trim().toUpperCase() || 'UNIT'
    }
  }
  
  const normalizedUnit = unit?.trim().toUpperCase() || 'UNIT'
  const numQuantity = Number(quantity)
  
  // Convert grams to kilograms if >= 1000
  if ((normalizedUnit === 'GM' || normalizedUnit === 'G') && Math.abs(numQuantity) >= 1000) {
    return {
      value: (numQuantity / 1000).toFixed(2),
      unit: 'KG'
    }
  }
  
  // Convert milliliters to liters if >= 1000
  if (normalizedUnit === 'ML' && Math.abs(numQuantity) >= 1000) {
    return {
      value: (numQuantity / 1000).toFixed(2),
      unit: 'L'
    }
  }
  
  // Keep original for other cases
  return {
    value: numQuantity.toFixed(2),
    unit: normalizedUnit
  }
}
