import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

const autoScheduleSchema = z.object({
  locationId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(['COST_OPTIMIZED', 'FAIR']),
});

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export async function autoSchedule(req: Request, res: Response): Promise<void> {
  const parsed = autoScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid data', details: parsed.error.errors });
    return;
  }

  const { locationId, startDate, endDate, mode } = parsed.data;
  const start = new Date(startDate);
  const end = new Date(endDate);

  // 1. Fetch requirements
  const requirements = await prisma.shiftRequirement.findMany({
    where: {
      locationId,
      date: { gte: start, lte: end },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  // 2. Fetch users with roles and availabilities
  const users = await prisma.user.findMany({
    where: { locationId, isActive: true },
    include: {
      jobRoles: true,
      availabilities: true,
      timeOffs: true,
    },
  });

  // Keep track of assigned hours and assigned days per user (for FAIR mode or overtime limits)
  const userAssignedHours: Record<string, number> = {};
  const userAssignedDays: Record<string, Set<number>> = {};
  users.forEach(u => {
    userAssignedHours[u.id] = 0;
    userAssignedDays[u.id] = new Set<number>();
  });

  const newShifts: any[] = [];

  // Delete existing shifts in this range first
  await prisma.shift.deleteMany({
    where: { locationId, date: { gte: start, lte: end } },
  });

  // 3. Greedily fill requirements
  for (const req of requirements) {
    const reqDayOfWeek = req.date.getDay();
    const reqStartMin = timeToMinutes(req.startTime);
    const reqEndMin = timeToMinutes(req.endTime);
    const reqDuration = (reqEndMin - reqStartMin) / 60; // in hours

    // Filter eligible users
    let eligibleUsers = users.filter(user => {
      // Must have the required job role
      if (!user.jobRoles.some(r => r.id === req.jobRoleId)) return false;

      // Check specific date time-offs
      // TimeOffs are usually saved at midnight UTC, and req.date is also at midnight UTC.
      // So a simple getTime() comparison should work if both are normalized.
      const hasTimeOff = user.timeOffs?.some(to => to.date.getTime() === req.date.getTime());
      if (hasTimeOff) return false;

      // Check availability constraints
      // If user has NO availabilities at all in DB, we assume they are available 24/7 (e.g. full-time)
      // Otherwise, they must have an availability record for this day of week that covers the requirement
      if (user.availabilities.length > 0) {
        const hasAvailability = user.availabilities.some(avail => {
          if (avail.dayOfWeek !== reqDayOfWeek) return false;
          const availStart = timeToMinutes(avail.startTime);
          const availEnd = timeToMinutes(avail.endTime);
          return availStart <= reqStartMin && availEnd >= reqEndMin;
        });
        if (!hasAvailability) return false;
      }

      // Check if they are already working at this exact time (simple overlap check)
      const hasConflict = newShifts.some(shift => 
        shift.userId === user.id &&
        shift.date.getTime() === req.date.getTime() &&
        !(timeToMinutes(shift.endTime) <= reqStartMin || timeToMinutes(shift.startTime) >= reqEndMin)
      );
      if (hasConflict) return false;

      // Check maxHoursPerWeek limit
      const currentHours = userAssignedHours[user.id] || 0;
      if (currentHours + reqDuration > user.maxHoursPerWeek) return false;

      // Check maxDaysPerWeek limit
      const currentDays = userAssignedDays[user.id];
      if (!currentDays.has(req.date.getTime()) && currentDays.size >= user.maxDaysPerWeek) {
        return false;
      }

      return true;
    });

    // Sort eligible users based on mode
    eligibleUsers.sort((a, b) => {
      if (mode === 'COST_OPTIMIZED') {
        // 1. Monthly salary employees first
        if (a.salaryType === 'MONTHLY' && b.salaryType !== 'MONTHLY') return -1;
        if (b.salaryType === 'MONTHLY' && a.salaryType !== 'MONTHLY') return 1;
        
        // 2. Then by lowest hourly wage
        if (a.salaryType === 'HOURLY' && b.salaryType === 'HOURLY') {
          return a.hourlyWage - b.hourlyWage;
        }
      } else {
        // FAIR mode: sort by least assigned hours
        return userAssignedHours[a.id] - userAssignedHours[b.id];
      }
      return 0;
    });

    // Take top N users to fill requirement
    const assignedUsers = eligibleUsers.slice(0, req.count);

    for (const assignedUser of assignedUsers) {
      const shiftData = {
        userId: assignedUser.id,
        locationId: req.locationId,
        jobRoleId: req.jobRoleId,
        date: req.date,
        startTime: req.startTime,
        endTime: req.endTime,
        dayType: 'WORKDAY',
      };
      newShifts.push(shiftData);
      userAssignedHours[assignedUser.id] += reqDuration;
      userAssignedDays[assignedUser.id].add(req.date.getTime());
    }
  }

  // Insert generated shifts
  if (newShifts.length > 0) {
    await prisma.shift.createMany({
      data: newShifts,
    });
  }

  res.json({ 
    success: true, 
    message: `Generated ${newShifts.length} shifts`,
    stats: { generatedShifts: newShifts.length }
  });
}
