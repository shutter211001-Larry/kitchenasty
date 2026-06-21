import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUnit(value: number, unit: string, settings?: { decimalPrecision?: number, autoUnitConversionThreshold?: number }) {
  const precision = settings?.decimalPrecision ?? 1;
  const threshold = settings?.autoUnitConversionThreshold ?? 0;
  
  let formattedValue = value;
  let formattedUnit = unit;

  if (threshold > 0 && Math.abs(value) >= threshold) {
    if (unit.toLowerCase() === 'g') {
      formattedValue = value / 1000;
      formattedUnit = 'kg';
    } else if (unit.toLowerCase() === 'ml') {
      formattedValue = value / 1000;
      formattedUnit = 'L';
    }
  }

  return {
    value: formattedValue.toFixed(precision),
    unit: formattedUnit
  };
}
