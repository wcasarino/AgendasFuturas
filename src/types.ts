export interface AgendaItem {
  id: string;
  dpto: string;
  caps: string;
  fecha: string; // ISO format YYYY-MM-DD
  fechaOriginal?: string; // dd/mm/aaaa as read from Excel
  dateObj: Date;
  turno: string; // Mañana, Tarde, Vespertino, etc.
  especialidad: string;
  profesional: string;
  turnos: number;
}

export interface LecturaData {
  fecha: string; // ISO format YYYY-MM-DD
  fechaOriginal: string; // dd/mm/aaaa
  dateObj: Date;
}

export interface FilterState {
  dpto: string;
  caps: string;
  turno: string;
  especialidad: string;
  profesional: string;
  search: string;
}

export interface DayAggregation {
  dateStr: string; // YYYY-MM-DD
  dateObj: Date;
  dayNumber: number;
  totalTurnos: number;
  hasTurnos: boolean;
  isLecturaDate: boolean;
  isCurrentMonth: boolean;
  byTurno: Record<string, number>;
  byEspecialidad: Record<string, number>;
  byCaps: Record<string, number>;
  items: AgendaItem[];
}

export interface MonthCalendarData {
  year: number;
  month: number; // 0-indexed (0 = Enero, 11 = Diciembre)
  monthName: string;
  yearMonthKey: string; // "YYYY-MM"
  days: DayAggregation[];
  totalTurnos: number;
  workingDaysWithTurnos: number;
}
