export type CanalType = 'Todos' | 'Sólo H.' | 'Bot' | 'Call' | 'Todos los Canales';

export interface AgendaItem {
  id: string;
  dpto: string;
  caps: string;
  fecha: string; // ISO format YYYY-MM-DD
  fechaOriginal?: string; // dd/mm/aaaa as read from sheet
  dateObj: Date;
  especialidad: string;
  profesional: string;
  estado: string; // Col F: Asignado, Libre, etc.
  todos: number; // Col G: número entero
  soloH: number; // Col H: número entero ("Sólo H.")
  bot: number; // Col I: número entero ("Bot")
  call: number; // Col J: número entero ("Call")
  turnos: number; // Suma/valor activo según el canal seleccionado
  turno?: string; // Legacy compatibility
}

export interface LecturaData {
  fecha: string; // ISO format YYYY-MM-DD
  fechaOriginal: string; // dd/mm/aaaa
  dateObj: Date;
}

export interface FilterState {
  dpto: string;
  caps: string;
  canal: string; // 'Todos' | 'Sólo H.' | 'Bot' | 'Call' | 'Todos los Canales'
  especialidad: string;
  profesional: string;
  estado?: string; // Optional filter by Estado ('Libre', 'Asignado', etc.)
  search: string;
  turno?: string; // Legacy compatibility
}

export interface DayAggregation {
  dateStr: string; // YYYY-MM-DD
  dateObj: Date;
  dayNumber: number;
  totalTurnos: number;
  turnosAsignados: number; // Suma de turnos con Estado "Asignado"
  turnosLibres: number; // Suma de turnos con Estado "Libre"
  hasTurnos: boolean;
  isLecturaDate: boolean;
  isCurrentMonth: boolean;
  byCanal?: Record<string, number>;
  byTurno?: Record<string, number>;
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
  totalAsignados: number;
  totalLibres: number;
  workingDaysWithTurnos: number;
}
