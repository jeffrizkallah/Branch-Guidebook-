import { describe, it, expect } from 'vitest'
import {
  loadBranches,
  loadBranch,
  loadRoles,
  getRole,
  filterBranches,
  getUniqueLocations,
  getUniqueManagers,
} from '../data'

describe('Data Loading Functions', () => {
  describe('loadBranches', () => {
    it('should load all branches', async () => {
      const branches = await loadBranches()
      expect(branches).toBeDefined()
      expect(Array.isArray(branches)).toBe(true)
      expect(branches.length).toBe(12)
    })

    it('should have required properties', async () => {
      const branches = await loadBranches()
      const branch = branches[0]
      expect(branch).toHaveProperty('id')
      expect(branch).toHaveProperty('slug')
      expect(branch).toHaveProperty('name')
      expect(branch).toHaveProperty('school')
      expect(branch).toHaveProperty('location')
      expect(branch).toHaveProperty('manager')
      expect(branch).toHaveProperty('kpis')
    })
  })

  describe('loadBranch', () => {
    it('should load a specific branch by slug', async () => {
      const branch = await loadBranch('isc-soufouh')
      expect(branch).toBeDefined()
      expect(branch?.name).toBe('ISC Soufouh')
    })

    it('should return undefined for non-existent slug', async () => {
      const branch = await loadBranch('non-existent-slug')
      expect(branch).toBeUndefined()
    })
  })

  describe('loadRoles', () => {
    it('should load all roles', () => {
      const roles = loadRoles()
      expect(roles).toBeDefined()
      expect(Array.isArray(roles)).toBe(true)
      expect(roles.length).toBe(5)
    })

    it('should have required role properties', () => {
      const roles = loadRoles()
      const role = roles[0]
      expect(role).toHaveProperty('roleId')
      expect(role).toHaveProperty('name')
      expect(role).toHaveProperty('responsibilities')
      expect(role).toHaveProperty('dailyFlow')
      expect(role).toHaveProperty('checklists')
    })
  })

  describe('getRole', () => {
    it('should get a specific role by roleId', () => {
      const role = getRole('manager')
      expect(role).toBeDefined()
      expect(role?.name).toBe('Branch Manager')
    })

    it('should return undefined for non-existent roleId', () => {
      const role = getRole('non-existent-role')
      expect(role).toBeUndefined()
    })
  })

  describe('getUniqueLocations', () => {
    it('should return unique locations', async () => {
      const locations = await getUniqueLocations()
      expect(locations).toBeDefined()
      expect(Array.isArray(locations)).toBe(true)
      expect(locations.length).toBeGreaterThan(0)
      
      // Check for duplicates
      const uniqueSet = new Set(locations)
      expect(uniqueSet.size).toBe(locations.length)
    })

    it('should include known locations', async () => {
      const locations = await getUniqueLocations()
      expect(locations).toContain('Dubai')
      expect(locations).toContain('Abu Dhabi')
    })
  })

  describe('getUniqueManagers', () => {
    it('should return unique managers', async () => {
      const managers = await getUniqueManagers()
      expect(managers).toBeDefined()
      expect(Array.isArray(managers)).toBe(true)
      expect(managers.length).toBe(12) // One manager per branch
      
      // Check for duplicates
      const uniqueSet = new Set(managers)
      expect(uniqueSet.size).toBe(managers.length)
    })
  })

  describe('filterBranches', () => {
    it('should filter by search query', async () => {
      const allBranches = await loadBranches()
      const filtered = filterBranches(allBranches, 'Soufouh', {})
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.some(b => b.name.includes('Soufouh'))).toBe(true)
    })

    it('should filter by location', async () => {
      const allBranches = await loadBranches()
      const filtered = filterBranches(allBranches, '', { location: 'Dubai' })
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.every(b => b.location === 'Dubai')).toBe(true)
    })

    it('should filter by manager', async () => {
      const allBranches = await loadBranches()
      const filtered = filterBranches(allBranches, '', { manager: 'Ahmed Al-Rashid' })
      expect(filtered.length).toBe(1)
      expect(filtered[0].manager).toBe('Ahmed Al-Rashid')
    })

    it('should filter by minimum hygiene score', async () => {
      const allBranches = await loadBranches()
      const filtered = filterBranches(allBranches, '', { minHygieneScore: 95 })
      expect(filtered.every(b => parseInt(b.kpis.hygieneScore) >= 95)).toBe(true)
    })

    it('should apply multiple filters', async () => {
      const allBranches = await loadBranches()
      const filtered = filterBranches(allBranches, '', {
        location: 'Dubai',
        minHygieneScore: 90,
      })
      expect(filtered.every(b => b.location === 'Dubai')).toBe(true)
      expect(filtered.every(b => parseInt(b.kpis.hygieneScore) >= 90)).toBe(true)
    })

    it('should return all branches with no filters', async () => {
      const allBranches = await loadBranches()
      const filtered = filterBranches(allBranches, '', {})
      expect(filtered.length).toBe(allBranches.length)
    })
  })
})
