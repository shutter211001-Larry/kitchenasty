import axios from 'axios';

interface TaiwanHoliday {
  date: string;
  isHoliday: boolean;
  description: string;
}

const holidayCache: Record<string, boolean> = {};
let lastFetchedYear: number | null = null;

export const fetchTaiwanHolidays = async (year: number) => {
  if (lastFetchedYear === year) return;

  try {
    // We use a popular open source repository that parses the Taiwan Gov Open Data reliably
    // Format: YYYYMMDD string -> TaiwanHoliday
    const response = await axios.get(`https://raw.githubusercontent.com/ruyut/TaiwanCalendar/master/data/${year}.json`);
    const data: TaiwanHoliday[] = response.data;
    
    data.forEach(day => {
      // Format date to YYYY-MM-DD
      const formattedDate = `${day.date.substring(0, 4)}-${day.date.substring(4, 6)}-${day.date.substring(6, 8)}`;
      holidayCache[formattedDate] = day.isHoliday;
    });
    
    lastFetchedYear = year;
    console.log(`Fetched Taiwan holidays for ${year}`);
  } catch (error) {
    console.error(`Failed to fetch holidays for ${year}`, error);
    // Fallback: If fetch fails, we just don't have holiday data, meaning no double pay
  }
};

export const isNationalHoliday = async (date: Date): Promise<boolean> => {
  const year = date.getUTCFullYear();
  await fetchTaiwanHolidays(year);
  
  const formattedDate = date.toISOString().split('T')[0];
  return holidayCache[formattedDate] || false;
};
