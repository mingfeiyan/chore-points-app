import { describe, it, expect } from 'vitest'
import { getWeekStart, isSameWeek, getSundayWeekStart } from '@/lib/week-utils'

describe('week-utils', () => {
  describe('getWeekStart', () => {
    it('should return Saturday 00:00:00 for a Wednesday', () => {
      // Wednesday Jan 29, 2026
      const date = new Date('2026-01-29T14:30:00')
      const weekStart = getWeekStart(date)

      expect(weekStart.getDay()).toBe(6) // Saturday
      expect(weekStart.getHours()).toBe(0)
      expect(weekStart.getMinutes()).toBe(0)
      expect(weekStart.getSeconds()).toBe(0)
      expect(weekStart.getDate()).toBe(24) // Saturday Jan 24
    })

    it('should return same day for a Saturday', () => {
      // Saturday Jan 24, 2026
      const date = new Date('2026-01-24T10:00:00')
      const weekStart = getWeekStart(date)

      expect(weekStart.getDay()).toBe(6)
      expect(weekStart.getDate()).toBe(24)
    })

    it('should return same week Saturday for a Friday', () => {
      // Friday Jan 30, 2026
      const date = new Date('2026-01-30T23:59:59')
      const weekStart = getWeekStart(date)

      expect(weekStart.getDay()).toBe(6)
      expect(weekStart.getDate()).toBe(24) // Saturday Jan 24
    })
  })

  describe('isSameWeek', () => {
    it('should return true for dates in the same week', () => {
      const saturday = new Date('2026-01-24T00:00:00')
      const friday = new Date('2026-01-30T23:59:59')

      expect(isSameWeek(saturday, friday)).toBe(true)
    })

    it('should return false for dates in different weeks', () => {
      const friday = new Date('2026-01-30T23:59:59')
      const saturday = new Date('2026-01-31T00:00:00')

      expect(isSameWeek(friday, saturday)).toBe(false)
    })
  })

  describe('getSundayWeekStart', () => {
    it('should return Sunday 00:00:00 for a Wednesday', () => {
      // Wednesday Apr 22, 2026
      const date = new Date('2026-04-22T14:30:00')
      const weekStart = getSundayWeekStart(date)

      expect(weekStart.getDay()).toBe(0) // Sunday
      expect(weekStart.getHours()).toBe(0)
      expect(weekStart.getMinutes()).toBe(0)
      expect(weekStart.getSeconds()).toBe(0)
      expect(weekStart.getDate()).toBe(19) // Sunday Apr 19
    })

    it('should return same day for a Sunday', () => {
      const date = new Date('2026-04-19T10:00:00')
      const weekStart = getSundayWeekStart(date)

      expect(weekStart.getDay()).toBe(0)
      expect(weekStart.getDate()).toBe(19)
    })

    it('should return same week Sunday for a Saturday', () => {
      // Saturday Apr 25, 2026
      const date = new Date('2026-04-25T23:59:59')
      const weekStart = getSundayWeekStart(date)

      expect(weekStart.getDay()).toBe(0)
      expect(weekStart.getDate()).toBe(19) // Sunday Apr 19
    })
  })
})
