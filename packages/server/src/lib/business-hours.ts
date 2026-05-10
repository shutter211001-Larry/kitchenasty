import { OperatingHour } from '@prisma/client';

interface BusinessHourSettings {
  preOpeningBuffer?: number;
  postClosingBuffer?: number;
}

/**
 * Checks if a given date falls within the operating hours of a location,
 * correctly handling overnight shifts and preparation buffers.
 */
export function isWithinHours(
  date: Date,
  hours: OperatingHour[],
  settings: BusinessHourSettings = {}
): { isOpen: boolean; error?: string } {
  const dayOfWeek = date.getDay();
  const dayHours = hours.find((h) => h.dayOfWeek === dayOfWeek);

  if (!dayHours || dayHours.isClosed) {
    return { isOpen: false, error: 'Location is closed on this day.' };
  }

  const { preOpeningBuffer = 0, postClosingBuffer = 0 } = settings;

  // Convert everything to minutes from midnight for robust comparison
  const [openH, openM] = dayHours.openTime.split(':').map(Number);
  const [closeH, closeM] = dayHours.closeTime.split(':').map(Number);

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const openMinutes = openH * 60 + openM + preOpeningBuffer;
  const closeMinutes = closeH * 60 + closeM - postClosingBuffer;

  const isOvernight = closeMinutes < openMinutes;

  let isOpen = false;
  if (isOvernight) {
    // Overnight shift: current time is after open OR before close
    isOpen = currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  } else {
    // Normal shift: current time is between open and close
    isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  if (!isOpen) {
    return { 
      isOpen: false, 
      error: `Scheduled time must be within business hours (${dayHours.openTime} - ${dayHours.closeTime}) considering preparation buffers.` 
    };
  }

  return { isOpen: true };
}

/**
 * Generates available time slots for a specific day, handling overnight logic.
 */
export function generateDaySlots(
  targetDate: Date,
  hours: OperatingHour,
  interval: number,
  settings: BusinessHourSettings = {},
  minStartTime?: Date
): string[] {
  const [openH, openM] = hours.openTime.split(':').map(Number);
  const [closeH, closeM] = hours.closeTime.split(':').map(Number);

  const start = new Date(targetDate);
  start.setHours(openH, openM, 0, 0);
  start.setMinutes(start.getMinutes() + (settings.preOpeningBuffer || 0));

  const end = new Date(targetDate);
  end.setHours(closeH, closeM, 0, 0);
  // Handle overnight: extend end to the next day
  if (closeH < openH || (closeH === openH && closeM < openM)) {
    end.setDate(end.getDate() + 1);
  }
  end.setMinutes(end.getMinutes() - (settings.postClosingBuffer || 0));

  const slots: string[] = [];
  const current = new Date(start);

  // If minStartTime is provided (e.g., for "Today"), skip past slots
  if (minStartTime && current < minStartTime) {
    const minutes = minStartTime.getMinutes();
    const alignedMinutes = Math.ceil(minutes / interval) * interval;
    current.setHours(minStartTime.getHours());
    current.setMinutes(alignedMinutes, 0, 0);
  }

  while (current <= end) {
    if (current >= start) {
      slots.push(current.toISOString());
    }
    current.setMinutes(current.getMinutes() + interval);
  }

  return slots;
}
