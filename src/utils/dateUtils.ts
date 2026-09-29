export const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const SPANISH_DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/**
 * Parses a date value from Google Sheets or Excel.
 * Strictly enforces "dd/mm/aaaa" (Day/Month/Year) format as specified for:
 * - Column C "Fecha" in Agendas sheet
 * - "Fecha" in Lectura sheet
 * Also handles Excel serial numbers, Date objects, and ISO "yyyy-mm-dd".
 */
export function parseExcelDate(val: unknown): { iso: string; formatted: string; dateObj: Date } | null {
  if (val === null || val === undefined || val === '') return null;

  // Case 1: Excel serial date number
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return null;
    // Excel base date is Dec 30, 1899 due to 1900 leap year bug
    // 86400 * 1000 ms per day
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);

    // Adjust for timezone offset so we get the exact calendar day
    const localDate = new Date(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate(), 12, 0, 0);
    return dateToResult(localDate);
  }

  // Case 2: Javascript Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    // SheetJS creates UTC Date objects for Excel cells (e.g. 00:00:00.000Z).
    // Using UTC getters prevents negative timezone offsets (e.g. Argentina GMT-3)
    // from shifting a 1st-of-the-month date into the previous month/day.
    const localDate = new Date(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate(), 12, 0, 0);
    return dateToResult(localDate);
  }

  // Case 3: String
  const str = String(val).trim();
  if (!str) return null;

  // PRIORITY 1: Strictly parse "dd/mm/aaaa", "dd/mm/aa", "dd-mm-aaaa", "d/m/yyyy"
  // with optional time (e.g. "28/09/2026", "21/09/26", "05/10/2026", "05/10/2026 00:00:00")
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:\s+.*)?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed (0 = Jan, 9 = Oct)
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) {
      year += 2000;
    }
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      const d = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month) {
        return dateToResult(d);
      }
    }
  }

  // PRIORITY 2: ISO format "yyyy-mm-dd" or "yyyy/mm/dd"
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:\s+.*)?$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      const d = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month) {
        return dateToResult(d);
      }
    }
  }

  // PRIORITY 3: ISO 8601 with 'T' (e.g. "2026-10-05T00:00:00.000Z")
  // Note: We deliberately avoid raw Date.parse(str) on slash-delimited dates
  // because JavaScript's default Date.parse treats "05/10/2026" as US format (MM/DD/YYYY).
  if (str.includes('T')) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const d = new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0);
      return dateToResult(d);
    }
  }

  return null;
}

function dateToResult(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const iso = `${y}-${m}-${day}`;
  const formatted = `${day}/${m}/${y}`;
  return { iso, formatted, dateObj: d };
}

export function formatDateDDMMAAAA(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
}

export function formatFriendlyDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = SPANISH_MONTHS[monthIdx] || '';
  return `${day} de ${monthName} de ${year}`;
}

export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
}

export function getPrevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
}

export interface CalendarCell {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  dateObj: Date;
}

/**
 * Builds a 35 or 42 day grid (Monday to Sunday) for the given year and month (0-indexed).
 */
export function buildMonthCalendarGrid(year: number, month: number): CalendarCell[] {
  const firstDayOfMonth = new Date(year, month, 1, 12, 0, 0);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Day of week: 0 is Sunday, 1 is Monday ... 6 is Saturday
  // We want Monday = 0, Tuesday = 1, ... Sunday = 6
  let firstDayDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (firstDayDayOfWeek === -1) firstDayDayOfWeek = 6; // Sunday is 6

  const cells: CalendarCell[] = [];

  // Previous month padding days (empty spacers)
  for (let i = firstDayDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, 1, 12, 0, 0);
    cells.push({
      dateStr: `pad-prev-${year}-${month}-${i}`,
      dayNumber: 0,
      isCurrentMonth: false,
      isWeekend: false,
      dateObj: d,
    });
  }

  // Current month days (1 to daysInMonth)
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day, 12, 0, 0);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const res = dateToResult(d);
    cells.push({
      dateStr: res.iso,
      dayNumber: day,
      isCurrentMonth: true,
      isWeekend,
      dateObj: d,
    });
  }

  // Next month padding days to complete row grid (multiples of 7)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day, 12, 0, 0);
    cells.push({
      dateStr: `pad-next-${year}-${month}-${day}`,
      dayNumber: 0,
      isCurrentMonth: false,
      isWeekend: false,
      dateObj: d,
    });
  }

  return cells;
}
