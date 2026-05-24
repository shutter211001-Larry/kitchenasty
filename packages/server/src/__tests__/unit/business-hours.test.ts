import { describe, it, expect } from 'vitest';
import { isWithinHours, generateDaySlots } from '../../lib/business-hours.js';
import { OperatingHour } from '@prisma/client';

describe('Business Hours Logic', () => {
  describe('isWithinHours', () => {
    it('handles normal business hours correctly', () => {
      const hours: OperatingHour[] = [
        {
          id: '1',
          locationId: 'loc1',
          dayOfWeek: 3, // Wed
          openTime: '11:00',
          closeTime: '21:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Wednesday 12:00 (within hours)
      const dateWithin = new Date('2026-05-27T12:00:00+08:00');
      expect(isWithinHours(dateWithin, hours)).toEqual({ isOpen: true });

      // Wednesday 10:00 (outside hours)
      const dateBefore = new Date('2026-05-27T10:00:00+08:00');
      expect(isWithinHours(dateBefore, hours).isOpen).toBe(false);

      // Wednesday 22:00 (outside hours)
      const dateAfter = new Date('2026-05-27T22:00:00+08:00');
      expect(isWithinHours(dateAfter, hours).isOpen).toBe(false);
    });

    it('correctly handles overnight session from previous day', () => {
      // Tuesday 22:00 to Wednesday 02:00 (stored as Tuesday session)
      const hours: OperatingHour[] = [
        {
          id: '1',
          locationId: 'loc1',
          dayOfWeek: 2, // Tue
          openTime: '22:00',
          closeTime: '02:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Wednesday 01:00 (which is Tuesday overnight, should be OPEN!)
      const wednesdayEarly = new Date('2026-05-27T01:00:00+08:00');
      
      const check = isWithinHours(wednesdayEarly, hours);
      expect(check.isOpen).toBe(true); // Now correctly open!
    });

    it('correctly handles overnight session from current day that has not started yet', () => {
      // Wednesday 22:00 to Thursday 02:00 (stored as Wednesday session)
      const hours: OperatingHour[] = [
        {
          id: '2',
          locationId: 'loc1',
          dayOfWeek: 3, // Wed
          openTime: '22:00',
          closeTime: '02:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Wednesday 01:00 (which is Wednesday early morning, should be CLOSED because Wednesday's overnight hours haven't started yet! Tuesday was closed.)
      const wednesdayEarly = new Date('2026-05-27T01:00:00+08:00');
      
      const check = isWithinHours(wednesdayEarly, hours);
      expect(check.isOpen).toBe(false); // Now correctly closed!
    });
  });

  describe('generateDaySlots', () => {
    it('generates slots for overnight hours from current day correctly', () => {
      // Tuesday 22:00 to Wednesday 02:00 (stored as Tuesday session)
      const sessions: OperatingHour[] = [
        {
          id: '1',
          locationId: 'loc1',
          dayOfWeek: 2, // Tue
          openTime: '22:00',
          closeTime: '02:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const targetDate = new Date('2026-05-26T00:00:00+08:00'); // Tuesday
      const slots = generateDaySlots(targetDate, sessions, 30);
      expect(slots.length).toBeGreaterThan(0);
    });
  });
});
